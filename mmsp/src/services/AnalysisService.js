/**
 * AnalysisService.js
 * ==================
 * Calls the Python ML server first.
 * Falls back to the Express rule engine if ML server is down.
 */

const API_URL = import.meta.env.VITE_API_URL    || 'http://localhost:4000/api';
const ML_URL  = import.meta.env.VITE_ML_URL     || 'http://localhost:5001';

export const AnalysisService = {

    /**
     * Main entry point.
     * Tries ML server first, falls back to rule engine.
     */
    async analyze(initialLandmarks, modifiedLandmarks, calibrationData, imageSize, options = {}) {
        const { goldenRatio = false } = options;

        // Try ML server first
        try {
            const mlResult = await this._callML(modifiedLandmarks, calibrationData, goldenRatio);
            if (mlResult && !mlResult.error) {
                // Enrich with measurements from rule engine
                const ruleResult = await this._callRuleEngine(
                    initialLandmarks, modifiedLandmarks, calibrationData, imageSize
                ).catch(() => null);

                return {
                    ...mlResult,
                    measurements:    ruleResult?.measurements    || [],
                    targetLandmarks: ruleResult?.targetLandmarks || [],
                    reasoning:       this._buildReasoning(mlResult, ruleResult),
                    classification:  ruleResult?.classification  || mlResult.procedure,
                };
            }
        } catch (e) {
            console.warn('ML server unavailable, falling back to rule engine:', e.message);
        }

        // Fallback — rule engine only
        return this._callRuleEngine(initialLandmarks, modifiedLandmarks, calibrationData, imageSize);
    },

    async _callML(landmarks, calibrationData, goldenRatio) {
        const res = await fetch(`${ML_URL}/ml/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                landmarks:   landmarks.map(l => ({ id: l.id, name: l.name, x: l.x, y: l.y })),
                calibration: calibrationData ? { pixelsPerMm: calibrationData.ratio } : null,
                goldenRatio,
            }),
            signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        if (!res.ok) throw new Error(`ML server: HTTP ${res.status}`);
        return res.json();
    },

    async _callRuleEngine(initialLandmarks, modifiedLandmarks, calibrationData, imageSize) {
        const res = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                initialLandmarks,
                modifiedLandmarks,
                calibration: calibrationData
                    ? { pixelsPerMm: calibrationData.ratio, method: calibrationData.method }
                    : null,
                imageSize,
            }),
        });
        if (!res.ok) throw new Error(`Rule engine: HTTP ${res.status}`);
        return res.json();
    },

    _buildReasoning(mlResult, ruleResult) {
        const source = mlResult.source || 'ml_model';
        const agree  = mlResult.bothAgree;
        const conf   = mlResult.confidencePct;

        let text = ruleResult?.reasoning || '';

        if (source.includes('ensemble') && agree) {
            text = `ML model and clinical rule engine both recommend: ${mlResult.procedure}. ` + text;
        } else if (source === 'ml_model') {
            text = `ML model recommendation (${conf}% confidence): ${mlResult.procedure}. ` + text;
        } else {
            text = `Clinical rule engine recommendation. ` + text;
        }

        return text.trim();
    },

    /** Check if ML server is running */
    async checkMLServer() {
        try {
            const res = await fetch(`${ML_URL}/ml/health`, { signal: AbortSignal.timeout(2000) });
            return res.ok;
        } catch { return false; }
    }
};
