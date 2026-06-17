import Delaunator from 'delaunator';
import { DeformationModel } from './DeformationModel';
import { GeometryUtils } from '../utils/geometry';
import { getProcedurePreset } from './OrthognathicProcedures';

export class AIService {
    constructor() {
        this.simulationGain = 1.3;
    }

    clamp(value, min = 0, max = 1) {
        return Math.min(max, Math.max(min, value));
    }

    findLandmark(landmarks, id) {
        return landmarks?.find?.(point => point?.id === id);
    }

    distance(a, b) {
        if (!a || !b) return 0;
        return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
    }

    estimateImageQuality(image) {
        try {
            if (!image?.width || !image?.height) {
                return { score: 0.72, brightness: 0.72, contrast: 0.72, sharpness: 0.72 };
            }

            const sampleSize = 96;
            const canvas = this.createWorkingCanvas(sampleSize, sampleSize);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
                return { score: 0.72, brightness: 0.72, contrast: 0.72, sharpness: 0.72 };
            }

            ctx.drawImage(image, 0, 0, sampleSize, sampleSize);
            const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
            const luminance = [];

            for (let i = 0; i < data.length; i += 4) {
                luminance.push((data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114));
            }

            const mean = luminance.reduce((sum, value) => sum + value, 0) / luminance.length;
            const variance = luminance.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / luminance.length;
            const contrastRaw = Math.sqrt(variance);

            let edgeEnergy = 0;
            let edgeCount = 0;
            for (let y = 1; y < sampleSize - 1; y += 1) {
                for (let x = 1; x < sampleSize - 1; x += 1) {
                    const i = y * sampleSize + x;
                    const gx = luminance[i + 1] - luminance[i - 1];
                    const gy = luminance[i + sampleSize] - luminance[i - sampleSize];
                    edgeEnergy += Math.abs(gx) + Math.abs(gy);
                    edgeCount += 1;
                }
            }

            canvas.width = 0;
            canvas.height = 0;

            const brightness = this.clamp(1 - (Math.abs(mean - 128) / 128), 0.25, 1);
            const contrast = this.clamp(contrastRaw / 54, 0.25, 1);
            const sharpness = this.clamp((edgeEnergy / Math.max(edgeCount, 1)) / 32, 0.25, 1);
            const score = this.clamp((brightness * 0.3) + (contrast * 0.3) + (sharpness * 0.4), 0.3, 1);

            return { score, brightness, contrast, sharpness };
        } catch {
            return { score: 0.72, brightness: 0.72, contrast: 0.72, sharpness: 0.72 };
        }
    }

    estimatePoseQuality(landmarks, image) {
        try {
            const leftEye = this.findLandmark(landmarks, 'pupil_l') || this.findLandmark(landmarks, 'eye_l_inner');
            const rightEye = this.findLandmark(landmarks, 'pupil_r') || this.findLandmark(landmarks, 'eye_r_inner');
            const nose = this.findLandmark(landmarks, 'pronasale') || this.findLandmark(landmarks, 'subnasale');
            const chin = this.findLandmark(landmarks, 'pogonion') || this.findLandmark(landmarks, 'gnathion');
            const mouth = this.findLandmark(landmarks, 'stomion') || this.findLandmark(landmarks, 'lower_lip_center');

            if (!leftEye || !rightEye || !nose || !chin) {
                return { score: 0.7, yaw: 0.7, roll: 0.7, coverage: 0.7 };
            }

            const eyeDistance = Math.max(this.distance(leftEye, rightEye), 1);
            const eyeMidX = (leftEye.x + rightEye.x) / 2;
            const eyeMidY = (leftEye.y + rightEye.y) / 2;
            const faceHeight = Math.max(this.distance({ x: eyeMidX, y: eyeMidY }, chin), 1);
            const faceCoverage = image?.height ? this.clamp(faceHeight / image.height / 0.42, 0.35, 1) : 0.75;

            const yawOffset = Math.abs(nose.x - eyeMidX) / eyeDistance;
            const rollOffset = Math.abs(leftEye.y - rightEye.y) / eyeDistance;
            const mouthTilt = mouth ? Math.abs(mouth.x - eyeMidX) / eyeDistance : 0.08;

            const yaw = this.clamp(1 - (yawOffset / 0.34), 0.25, 1);
            const roll = this.clamp(1 - (rollOffset / 0.16), 0.25, 1);
            const symmetry = this.clamp(1 - (mouthTilt / 0.42), 0.25, 1);
            const score = this.clamp((yaw * 0.4) + (roll * 0.25) + (symmetry * 0.2) + (faceCoverage * 0.15), 0.25, 1);

            return { score, yaw, roll, coverage: faceCoverage };
        } catch {
            return { score: 0.7, yaw: 0.7, roll: 0.7, coverage: 0.7 };
        }
    }

    estimateMovementRisk(originalLandmarks, newLandmarks) {
        const leftEye = this.findLandmark(originalLandmarks, 'pupil_l') || this.findLandmark(originalLandmarks, 'eye_l_inner');
        const rightEye = this.findLandmark(originalLandmarks, 'pupil_r') || this.findLandmark(originalLandmarks, 'eye_r_inner');
        const normalizer = Math.max(this.distance(leftEye, rightEye), 42);

        const displacements = originalLandmarks.map((o, i) => {
            const m = newLandmarks[i];
            if (!o || !m) return 0;
            return Math.hypot((m.x || 0) - (o.x || 0), (m.y || 0) - (o.y || 0));
        }).filter(Number.isFinite);

        if (displacements.length === 0) {
            return { score: 0.75, averagePx: 0, maxPx: 0, averageNormalized: 0, maxNormalized: 0 };
        }

        const averagePx = displacements.reduce((a, b) => a + b, 0) / displacements.length;
        const maxPx = Math.max(...displacements);
        const averageNormalized = averagePx / normalizer;
        const maxNormalized = maxPx / normalizer;
        const score = this.clamp(1 - ((averageNormalized * 1.35) + (maxNormalized * 0.55)), 0.28, 1);

        return { score, averagePx, maxPx, averageNormalized, maxNormalized };
    }

    // Safe confidence scoring. This does not affect rendering output.
    computeConfidenceDetails(originalLandmarks, newLandmarks, options = {}) {
        try {
            if (!Array.isArray(originalLandmarks) || !Array.isArray(newLandmarks) || originalLandmarks.length === 0) {
                return {
                    score: 0.75,
                    factors: {
                        imageQuality: 0.75,
                        facePose: 0.75,
                        movementScope: 0.75,
                        detectionQuality: 0.75
                    },
                    movement: { averagePx: 0, maxPx: 0 },
                    imageQuality: { score: 0.75 },
                    pose: { score: 0.75 }
                };
            }

            const visibilityValues = originalLandmarks
                .map(point => point?.visibility)
                .filter(value => typeof value === 'number' && Number.isFinite(value));

            const detectionQuality = visibilityValues.length > 0
                ? this.clamp(visibilityValues.reduce((sum, value) => sum + value, 0) / visibilityValues.length)
                : this.clamp(originalLandmarks.length / 52, 0.68, 0.92);

            const imageQuality = this.estimateImageQuality(options.originalImage);
            const pose = this.estimatePoseQuality(originalLandmarks, options.originalImage);
            const movement = this.estimateMovementRisk(originalLandmarks, newLandmarks);

            let confidence = (
                (imageQuality.score * 0.28) +
                (pose.score * 0.24) +
                (movement.score * 0.34) +
                (detectionQuality * 0.14)
            );

            if (movement.maxNormalized > 0.75) {
                confidence -= 0.12;
            } else if (movement.maxNormalized > 0.5) {
                confidence -= 0.06;
            }

            const score = this.clamp(confidence, 0.45, 0.96);
            return {
                score,
                factors: {
                    imageQuality: imageQuality.score,
                    facePose: pose.score,
                    movementScope: movement.score,
                    detectionQuality
                },
                movement,
                imageQuality,
                pose
            };
        } catch {
            return {
                score: 0.75,
                factors: {
                    imageQuality: 0.75,
                    facePose: 0.75,
                    movementScope: 0.75,
                    detectionQuality: 0.75
                },
                movement: { averagePx: 0, maxPx: 0 },
                imageQuality: { score: 0.75 },
                pose: { score: 0.75 }
            };
        }
    }

    computeConfidence(originalLandmarks, newLandmarks, options = {}) {
        return this.computeConfidenceDetails(originalLandmarks, newLandmarks, options).score;
    }

    getAnchorPoints(width, height) {
    const pts = [];
    // Grid of anchor points across the entire image
    const cols = 5;
    const rows = 7;
    for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
            pts.push({ x: (c / cols) * width, y: (r / rows) * height, z: 0 });
        }
    }
    return pts;
}

    stabilizeLandmarks(originalLandmarks, newLandmarks) {
        return originalLandmarks.map((orig, i) => {
            const current = newLandmarks[i] ?? orig;
            const stiffness = orig?.stiffness ?? 1;
            const visualResponse = Math.min(1, Math.max(stiffness, 0.45) * this.simulationGain);

            return {
                ...current,
                x: orig.x + (current.x - orig.x) * visualResponse,
                y: orig.y + (current.y - orig.y) * visualResponse,
                z: (orig.z || 0) + ((current.z || 0) - (orig.z || 0)) * visualResponse
            };
        });
    }

   buildWarpMesh(originalLandmarks, stabilizedLandmarks, width, height) {
    const baseAnchors = this.getAnchorPoints(width, height);
    const influenceDistance = DeformationModel.getInfluenceDistance(width, height);
    const deformedAnchors = DeformationModel.deformPoints(
        baseAnchors,
        originalLandmarks,
        stabilizedLandmarks,
        influenceDistance
    );

    const sourcePoints = [...originalLandmarks, ...baseAnchors];
    const targetPoints = [...stabilizedLandmarks, ...deformedAnchors];
    const coords = sourcePoints.flatMap(point => [point.x, point.y]);
    const triangulation = new Delaunator(coords);

    return { sourcePoints, targetPoints, triangles: triangulation.triangles };
}

    createWorkingCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }

    async rasterizeImage(originalImage) {
        const canvas = this.createWorkingCanvas(originalImage.width, originalImage.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas 2D context is unavailable');
        }

        ctx.drawImage(originalImage, 0, 0);
        return { canvas, ctx };
    }

    drawWarpTriangle(ctx, sourceCanvas, sourceTriangle, targetTriangle) {
        const transform = GeometryUtils.getAffineTransform(sourceTriangle, targetTriangle);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(targetTriangle[0].x, targetTriangle[0].y);
        ctx.lineTo(targetTriangle[1].x, targetTriangle[1].y);
        ctx.lineTo(targetTriangle[2].x, targetTriangle[2].y);
        ctx.closePath();
        ctx.clip();

        ctx.setTransform(
            transform.a,
            transform.b,
            transform.c,
            transform.d,
            transform.e,
            transform.f
        );
        ctx.drawImage(sourceCanvas, 0, 0);
        ctx.restore();
    }

    async renderWarpOutcome(originalImage, originalLandmarks, newLandmarks) {
    const { canvas: sourceCanvas } = await this.rasterizeImage(originalImage);
    const destinationCanvas = this.createWorkingCanvas(originalImage.width, originalImage.height);
    const destinationCtx = destinationCanvas.getContext('2d');

    if (!destinationCtx) {
        throw new Error('Destination canvas 2D context is unavailable');
    }

    const stabilizedLandmarks = this.stabilizeLandmarks(originalLandmarks, newLandmarks);
    const { sourcePoints, targetPoints, triangles } = this.buildWarpMesh(
        originalLandmarks,
        stabilizedLandmarks,
        originalImage.width,
        originalImage.height
    );

    // Draw original as base so no gaps show through
    destinationCtx.drawImage(sourceCanvas, 0, 0);
    destinationCtx.imageSmoothingEnabled = true;

    for (let i = 0; i < triangles.length; i += 3) {
        const i0 = triangles[i];
        const i1 = triangles[i + 1];
        const i2 = triangles[i + 2];

        const sourceTriangle = [sourcePoints[i0], sourcePoints[i1], sourcePoints[i2]];
        const targetTriangle = [targetPoints[i0], targetPoints[i1], targetPoints[i2]];

        const area = Math.abs(
            (targetTriangle[0].x * (targetTriangle[1].y - targetTriangle[2].y)) +
            (targetTriangle[1].x * (targetTriangle[2].y - targetTriangle[0].y)) +
            (targetTriangle[2].x * (targetTriangle[0].y - targetTriangle[1].y))
        );

        if (area < 0.5) continue;

        this.drawWarpTriangle(destinationCtx, sourceCanvas, sourceTriangle, targetTriangle);
    }

    destinationCtx.setTransform(1, 0, 0, 1, 0, 0);
    destinationCtx.globalCompositeOperation = 'source-over';

    return await createImageBitmap(destinationCanvas);
}

    async applyProcedureEmphasis(bitmap, originalImage, originalLandmarks, targetLandmarks, procedureId, intensity = 1) {
        const procedure = getProcedurePreset(procedureId);
        const canvas = this.createWorkingCanvas(originalImage.width, originalImage.height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return bitmap;
        }

        ctx.drawImage(bitmap, 0, 0);

        const isLowerFace = procedure.category === 'Genioplasty'
            || procedure.category === 'BSSO'
            || procedure.id.includes('chin')
            || procedure.id.includes('mandibular');
        const regionY = isLowerFace ? canvas.height * 0.43 : 0;
        const regionH = isLowerFace ? canvas.height * 0.57 : canvas.height * 0.48;
        const regionX = procedure.category === 'SARPE' ? canvas.width * 0.08 : 0;
        const regionW = procedure.category === 'SARPE' ? canvas.width * 0.84 : canvas.width;
        const shiftX = procedure.category === 'SARPE'
            ? 10 * intensity
            : isLowerFace
                ? 8 * intensity
                : 5 * intensity;
        const shiftY = procedure.category === 'Le Fort I'
            ? -7 * intensity
            : isLowerFace
                ? 5 * intensity
                : 0;

        ctx.save();
        ctx.beginPath();
        ctx.rect(regionX, regionY, regionW, regionH);
        ctx.clip();
        ctx.drawImage(
            bitmap,
            regionX,
            regionY,
            regionW,
            regionH,
            regionX + shiftX,
            regionY + shiftY,
            regionW,
            regionH
        );
        ctx.restore();

        const result = await createImageBitmap(canvas);
        canvas.width = 0;
        canvas.height = 0;
        return result;
    }

    async createFallbackOutcome(originalImage) {
        const canvas = this.createWorkingCanvas(originalImage.width, originalImage.height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return await createImageBitmap(originalImage);
        }

        ctx.drawImage(originalImage, 0, 0);
        const result = await createImageBitmap(canvas);
        canvas.width = 0;
        canvas.height = 0;
        return result;
    }

    async generateOutcome(originalImage, originalLandmarks, newLandmarks, options = {}) {
        return new Promise((resolve) => {
            console.log("AIService: Generating warp-based outcome...");
            const procedureId = options.procedureId ?? 'mandibular_advancement';
            const intensity = options.intensity ?? 1;

            setTimeout(async () => {
                try {
                    const weightedLandmarks = this.stabilizeLandmarks(originalLandmarks, newLandmarks);

                    let renderLandmarks = weightedLandmarks;
                    try {
                        renderLandmarks = DeformationModel.deformPoints(
                            originalLandmarks,
                            originalLandmarks,
                            weightedLandmarks
                        );
                    } catch (deformationError) {
                        console.warn("AIService: Deformation spread failed, using weighted landmarks.", deformationError);
                    }

                    let result = await this.renderWarpOutcome(
                        originalImage,
                        originalLandmarks,
                        renderLandmarks
                    );

                    const confidence = this.computeConfidence(originalLandmarks, newLandmarks, { originalImage });
                    console.log("Confidence:", Math.round(confidence * 100) + "%");

                    const difference = await this.measureDifference(originalImage, result);
                    if (difference < 0.002) {
                        console.warn("AIService: Warp output was too close to the original, boosting deformation.");
                        const boostedLandmarks = this.stabilizeLandmarksWithGain(
                            originalLandmarks,
                            newLandmarks,
                            1.7
                        );
                        const boostedRenderLandmarks = DeformationModel.deformPoints(
                            originalLandmarks,
                            originalLandmarks,
                            boostedLandmarks
                        );
                        result = await this.renderWarpOutcome(
                            originalImage,
                            originalLandmarks,
                            boostedRenderLandmarks
                        );
                    }

                    // result = await this.applyProcedureEmphasis(
//     result,
//     originalImage,
//     originalLandmarks,
//     renderLandmarks,
//     procedureId,
//     intensity
// );

                    console.log("AIService: Outcome generation complete.");
                    resolve(result);
                } catch (error) {
                    console.error("AIService: Outcome generation failed.", error);
                    try {
                        const fallback = await this.createFallbackOutcome(originalImage);
                        console.warn("AIService: Returned fallback outcome after generation failure.");
                        resolve(fallback);
                    } catch (fallbackError) {
                        console.error("AIService: Fallback outcome failed.", fallbackError);
                        resolve(await createImageBitmap(originalImage));
                    }
                } finally {
                    // Let the browser reclaim the temporary canvases.
                }
            }, 1500);
        });
    }

    stabilizeLandmarksWithGain(originalLandmarks, newLandmarks, gain) {
        return originalLandmarks.map((orig, i) => {
            const current = newLandmarks[i] ?? orig;
            const stiffness = orig?.stiffness ?? 1;
            const visualResponse = Math.min(1, Math.max(stiffness, 0.45) * gain);

            return {
                ...current,
                x: orig.x + (current.x - orig.x) * visualResponse,
                y: orig.y + (current.y - orig.y) * visualResponse,
                z: (orig.z || 0) + ((current.z || 0) - (orig.z || 0)) * visualResponse
            };
        });
    }

    async measureDifference(originalImage, resultBitmap) {
        const width = originalImage.width;
        const height = originalImage.height;
        const sampleCanvas = this.createWorkingCanvas(width, height);
        const ctx = sampleCanvas.getContext('2d');

        if (!ctx) {
            return 1;
        }

        ctx.drawImage(originalImage, 0, 0);
        const originalPixels = ctx.getImageData(0, 0, width, height).data;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(resultBitmap, 0, 0);
        const resultPixels = ctx.getImageData(0, 0, width, height).data;

        const totalSamples = Math.min(width * height, 2000);
        const step = Math.max(1, Math.floor((width * height) / totalSamples));
        let diff = 0;
        let count = 0;

        for (let i = 0; i < originalPixels.length; i += step * 4) {
            diff += Math.abs(originalPixels[i] - resultPixels[i]);
            diff += Math.abs(originalPixels[i + 1] - resultPixels[i + 1]);
            diff += Math.abs(originalPixels[i + 2] - resultPixels[i + 2]);
            count += 3;
        }

        return count > 0 ? diff / (count * 255) : 0;
    }
}
