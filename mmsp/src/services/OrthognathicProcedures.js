const CHIN_GROUP = new Set([
    'pogonion',
    'gnathion',
    'chin_mid',
    'chin_lower'
]);

const LOWER_LIP_GROUP = new Set([
    'labrale_inferius',
    'lower_lip_center',
    'lower_lip_top_l',
    'lower_lip_top_r',
    'lower_lip_bottom_l',
    'lower_lip_bottom_r',
    'mouth_center_lower',
    'stomion',
    'cheilion_l',
    'cheilion_r'
]);

const MANDIBLE_GROUP = new Set([
    'gonion_l',
    'gonion_r',
    'jaw_l1',
    'jaw_r1',
    'jaw_l2',
    'jaw_r2',
    'mandible_l_mid',
    'mandible_r_mid'
]);

const MAXILLA_GROUP = new Set([
    'nasion',
    'subnasale',
    'labrale_superius',
    'upper_lip_top_l',
    'upper_lip_top_r',
    'upper_lip_bottom_l',
    'upper_lip_bottom_r',
    'upper_lip_center',
    'nose_bridge_top',
    'nose_bridge_mid',
    'nose_columella',
    'nose_alar_l',
    'nose_alar_r',
    'nose_base_l',
    'nose_base_r'
]);

const MIDFACE_GROUP = new Set([
    'glabella',
    'zygion_l',
    'zygion_r',
    'cheek_l_upper',
    'cheek_r_upper',
    'cheek_l_mid',
    'cheek_r_mid',
    'eye_l_inner',
    'eye_l_outer',
    'eye_l_upper',
    'eye_l_lower',
    'eye_r_inner',
    'eye_r_outer',
    'eye_r_upper',
    'eye_r_lower'
]);

const ALL_LOWER_FACE_GROUP = new Set([
    ...CHIN_GROUP,
    ...LOWER_LIP_GROUP,
    ...MANDIBLE_GROUP
]);

const ALL_UPPER_FACE_GROUP = new Set([
    ...MAXILLA_GROUP,
    ...MIDFACE_GROUP
]);

const GROUP_REGISTRY = {
    CHIN_GROUP,
    LOWER_LIP_GROUP,
    MANDIBLE_GROUP,
    MAXILLA_GROUP,
    MIDFACE_GROUP,
    ALL_LOWER_FACE_GROUP,
    ALL_UPPER_FACE_GROUP
};

const PROCEDURE_PRESETS = [
    {
        id: 'chin_advancement',
        label: 'Chin Advancement',
        category: 'Genioplasty',
        catalogLabel: 'Chin advancement',
        summary: 'Advances the chin point and reshapes the lower third.',
        pattern: 'Chin pogonion and gnathion advance most, with lighter lower-lip and mandibular border follow-through.',
        affectedRegions: ['Chin', 'Lower lip', 'Mandibular border'],
        intensity: 1.15,
        effects: [
            { groups: CHIN_GROUP, dy: 10, widen: 0.05, scaleY: 0.025 },
            { groups: LOWER_LIP_GROUP, dy: 4, widen: 0.025, scaleY: 0.01 },
            { groups: MANDIBLE_GROUP, dy: 4, widen: 0.02 }
        ]
    },
    {
        id: 'chin_setback',
        label: 'Chin Setback',
        category: 'Genioplasty',
        catalogLabel: 'Chin setback',
        summary: 'Retreats the chin point and softens the lower facial projection.',
        pattern: 'Chin landmarks move posteriorly with a conservative soft-tissue response around the lower lip.',
        affectedRegions: ['Chin', 'Lower lip', 'Mandibular border'],
        intensity: 1.1,
        effects: [
            { groups: CHIN_GROUP, dy: -9, widen: -0.045, scaleY: -0.02 },
            { groups: LOWER_LIP_GROUP, dy: -3, widen: -0.015 },
            { groups: MANDIBLE_GROUP, dy: -3, widen: -0.02 }
        ]
    },
    {
        id: 'mandibular_advancement',
        label: 'BSSO Advancement',
        category: 'BSSO',
        catalogLabel: 'BSSO advancement',
        summary: 'Brings the lower jaw forward with a stronger chin and jawline.',
        pattern: 'Mandibular and chin clusters move together, with lower-lip support changing less than the bony landmarks.',
        affectedRegions: ['Mandible', 'Chin', 'Lower lip'],
        intensity: 1.2,
        effects: [
            { groups: CHIN_GROUP, dy: 14, widen: 0.08, scaleY: 0.03 },
            { groups: MANDIBLE_GROUP, dy: 9, widen: 0.055, scaleY: 0.018 },
            { groups: LOWER_LIP_GROUP, dy: 5, widen: 0.025, scaleY: 0.01 }
        ]
    },
    {
        id: 'mandibular_setback',
        label: 'BSSO Setback',
        category: 'BSSO',
        catalogLabel: 'BSSO setback',
        summary: 'Moves the lower jaw back to soften mandibular prominence.',
        pattern: 'Mandibular landmarks retreat as a unit while lip and chin response is damped for soft-tissue realism.',
        affectedRegions: ['Mandible', 'Chin', 'Lower lip'],
        intensity: 1.15,
        effects: [
            { groups: CHIN_GROUP, dy: -13, widen: -0.075, scaleY: -0.028 },
            { groups: MANDIBLE_GROUP, dy: -8, widen: -0.05, scaleY: -0.015 },
            { groups: LOWER_LIP_GROUP, dy: -4, widen: -0.02, scaleY: -0.008 }
        ]
    },
    {
        id: 'maxillary_advancement',
        label: 'Le Fort I Advancement',
        category: 'Le Fort I',
        catalogLabel: 'Le Fort I advancement',
        summary: 'Moves the upper jaw forward and rebalances the midface.',
        pattern: 'Maxillary, nasal base, and upper-lip landmarks shift together with lighter midface carry.',
        affectedRegions: ['Maxilla', 'Nasal base', 'Upper lip', 'Midface'],
        intensity: 1.05,
        effects: [
            { groups: MAXILLA_GROUP, dy: -8, widen: 0.02, scaleY: -0.015 },
            { groups: MIDFACE_GROUP, dy: -4, widen: 0.02, scaleY: -0.008 },
            { groups: LOWER_LIP_GROUP, dy: -2, widen: 0.01 }
        ]
    },
    {
        id: 'maxillary_impaction',
        label: 'Le Fort I Impaction',
        category: 'Le Fort I',
        catalogLabel: 'Le Fort I impaction',
        summary: 'Lifts the upper jaw upward, often used to reduce vertical excess.',
        pattern: 'Upper jaw and nasal base landmarks move superiorly with limited cheek response.',
        affectedRegions: ['Maxilla', 'Nasal base', 'Upper lip'],
        intensity: 1.1,
        effects: [
            { groups: MAXILLA_GROUP, dy: -13, widen: -0.01, scaleY: -0.03 },
            { groups: MIDFACE_GROUP, dy: -7, widen: -0.01, scaleY: -0.015 }
        ]
    },
    {
        id: 'maxillary_down_graft',
        label: 'Le Fort I Down-Graft',
        category: 'Le Fort I',
        catalogLabel: 'Le Fort I down-graft',
        summary: 'Lengthens the upper face by moving the maxilla downward.',
        pattern: 'Maxillary landmarks descend, with upper-lip and midface soft-tissue support following proportionally.',
        affectedRegions: ['Maxilla', 'Upper lip', 'Midface'],
        intensity: 1.08,
        effects: [
            { groups: MAXILLA_GROUP, dy: 12, widen: 0.015, scaleY: 0.028 },
            { groups: MIDFACE_GROUP, dy: 6, widen: 0.01, scaleY: 0.012 }
        ]
    },
    {
        id: 'transverse_expansion',
        label: 'SARPE Expansion',
        category: 'SARPE',
        catalogLabel: 'SARPE / transverse expansion',
        summary: 'Widens the upper arch and broadens the smile corridor.',
        pattern: 'Left and right maxillary landmarks expand laterally from midline, strongest around the upper arch.',
        affectedRegions: ['Maxilla', 'Nasal base', 'Midface width'],
        intensity: 1.2,
        effects: [
            { groups: MAXILLA_GROUP, widen: 0.11, scaleX: 0.06 },
            { groups: MIDFACE_GROUP, widen: 0.08, scaleX: 0.045 },
            { groups: MANDIBLE_GROUP, widen: 0.04, scaleX: 0.02 }
        ]
    },
    {
        id: 'double_jaw_correction',
        label: 'Bimaxillary Correction',
        category: 'Bimaxillary',
        catalogLabel: 'Bimaxillary correction',
        summary: 'Combines upper and lower jaw repositioning for larger bite changes.',
        pattern: 'Upper and lower jaw clusters move in coordinated opposite patterns for global facial balance.',
        affectedRegions: ['Maxilla', 'Mandible', 'Chin', 'Lips'],
        intensity: 1.15,
        effects: [
            { groups: MAXILLA_GROUP, dy: -7, widen: 0.025, scaleY: -0.012 },
            { groups: MANDIBLE_GROUP, dy: 8, widen: 0.045, scaleY: 0.015 },
            { groups: CHIN_GROUP, dy: 10, widen: 0.06, scaleY: 0.02 },
            { groups: LOWER_LIP_GROUP, dy: 3, widen: 0.02 }
        ]
    }
];

// ── Patient-friendly explanations ───────────────────────────────────────
// Plain-language version of the clinical PROCEDURE_INFO used in the doctor
// workspace — written for the Patient View, not for clinicians.
const PATIENT_FRIENDLY_INFO = {
    chin_advancement: {
        whatItIs: 'A procedure that gently moves your chin bone forward to give your profile better balance. Only the chin is moved — your bite stays the same.',
        recovery: '4–6 weeks',
        whatToExpect: 'Some swelling and tightness around the chin for the first couple of weeks, with most people back to normal routines within about a month.',
    },
    chin_setback: {
        whatItIs: 'A procedure that moves a chin that sticks out too far back into better balance with the rest of your face. Your bite is not affected.',
        recovery: '4–6 weeks',
        whatToExpect: 'Mild swelling around the chin and jawline that settles over a few weeks.',
    },
    mandibular_advancement: {
        whatItIs: 'Your lower jaw is carefully repositioned forward so your bite and profile work better together. This is a well-established procedure called BSSO.',
        recovery: '6–8 weeks',
        whatToExpect: 'A soft-food diet and some swelling for the first couple of weeks, with most of the bruising and swelling resolving within 6–8 weeks.',
    },
    mandibular_setback: {
        whatItIs: 'Your lower jaw is carefully repositioned backward to correct a bite where the lower jaw sits too far forward.',
        recovery: '6–8 weeks',
        whatToExpect: 'Similar to jaw advancement — soft foods early on, with swelling improving steadily over 6–8 weeks.',
    },
    maxillary_advancement: {
        whatItIs: 'Your upper jaw is moved forward to correct a recessed midface and improve your profile and bite together.',
        recovery: '8–10 weeks',
        whatToExpect: 'A longer recovery than chin or lower-jaw procedures, with swelling around the cheeks and upper lip that improves over 8–10 weeks.',
    },
    maxillary_impaction: {
        whatItIs: 'Your upper jaw is moved upward to reduce a "gummy smile" and shorten an overly long lower face.',
        recovery: '6–8 weeks',
        whatToExpect: 'Noticeable improvement in smile appearance once swelling resolves, typically over 6–8 weeks.',
    },
    maxillary_down_graft: {
        whatItIs: 'Your upper jaw is lengthened with a small bone graft to correct a short upper lip and improve your smile.',
        recovery: '8–10 weeks',
        whatToExpect: 'A bit more healing time since a graft is involved, with steady improvement over 8–10 weeks.',
    },
    transverse_expansion: {
        whatItIs: 'A device gently widens a narrow upper jaw over time (SARPE), which can\'t be achieved with braces alone once you\'re fully grown.',
        recovery: '4–6 months (expansion period)',
        whatToExpect: 'A gradual process — you\'ll turn a small expander a little each day, with final results visible over a few months.',
    },
    double_jaw_correction: {
        whatItIs: 'Both your upper and lower jaws are repositioned together (bimaxillary surgery) for cases where one jaw alone wouldn\'t fully correct your bite and profile.',
        recovery: '10–12 weeks',
        whatToExpect: 'The most involved of these procedures, with a longer initial recovery — most people feel mostly back to normal by 10–12 weeks.',
    },
};

/**
 * Returns a plain-language explanation of a procedure for the Patient View.
 * Falls back to a generic message if the id isn't recognised.
 */
export function getPatientFriendlyInfo(procedureId) {
    return PATIENT_FRIENDLY_INFO[procedureId] || {
        whatItIs: 'Your doctor has recorded a recommendation for your case. Ask your doctor for full details about what this involves.',
        recovery: 'Varies — ask your doctor',
        whatToExpect: 'Your doctor will walk you through exactly what to expect for your specific plan.',
    };
}

export const DEFAULT_PROCEDURE_ID = 'mandibular_advancement';

export function getProcedurePreset(procedureId) {
    return PROCEDURE_PRESETS.find(preset => preset.id === procedureId) ?? PROCEDURE_PRESETS[0];
}

// ── Ensemble (ML + rule engine) procedure name → simulation preset id ──────
// The ML model classifies into 8 broad classes (see python/label_map.json);
// the simulator works off the more granular PROCEDURE_PRESETS below. Where a
// class covers a combination (e.g. "BSSO + Genioplasty") or has no direction
// implied (e.g. "Genioplasty Only"), this maps to the closest single preset —
// the primary jaw movement is applied; review/adjust before relying on this
// for combination cases.
const ML_LABEL_TO_PRESET_ID = {
    'no surgery required': null,
    'bsso advancement (class ii)': 'mandibular_advancement',
    'bsso setback (class iii)': 'mandibular_setback',
    'bsso advancement + genioplasty': 'mandibular_advancement',
    'bsso setback + genioplasty': 'mandibular_setback',
    'le fort i + bsso (bimaxillary)': 'double_jaw_correction',
    'genioplasty only': 'chin_advancement',
    'golden ratio optimization': null,
};

/**
 * Resolves a Procedure Recommendation label (from the ML model, the rule
 * engine, or a "top3" alternative) to a PROCEDURE_PRESETS id that can be
 * passed into buildProcedureSimulationLandmarks / setSelectedProcedureId.
 * Returns null when there's no surgical preset to apply (e.g. "No Surgery
 * Required" or "Golden Ratio Optimization", which isn't a jaw movement).
 */
export function mapRecommendationToPresetId(procedureLabel) {
    if (!procedureLabel) return null;
    const key = procedureLabel.trim().toLowerCase();
    if (key in ML_LABEL_TO_PRESET_ID) return ML_LABEL_TO_PRESET_ID[key];

    // Fallback: try to match directly against a preset's own label/id
    const directMatch = PROCEDURE_PRESETS.find(
        p => p.label.toLowerCase() === key || p.id === key
    );
    return directMatch?.id ?? null;
}

function pointSide(point, centerX) {
    if (point.x < centerX) return -1;
    if (point.x > centerX) return 1;
    return 0;
}

function pointInGroup(point, groupSet) {
    if (!point?.id || !groupSet) return false;

    if (typeof groupSet === 'string') {
        const resolvedGroup = GROUP_REGISTRY[groupSet];
        return Boolean(resolvedGroup?.has?.(point.id));
    }

    if (typeof groupSet.has === 'function') {
        return groupSet.has(point.id);
    }

    if (Array.isArray(groupSet)) {
        return groupSet.includes(point.id);
    }

    return false;
}

function applyEffect(point, effect, imageWidth, imageHeight, intensity, weight) {
    const centerX = imageWidth / 2;
    const centerY = imageHeight / 2;
    const side = pointSide(point, centerX);
    const reachX = Math.max(imageWidth * 0.014, 4);
    let x = point.x;
    let y = point.y;

    const strength = intensity * weight;

    if (effect.dx) {
        x += effect.dx * strength;
    }

    if (effect.dy) {
        y += effect.dy * strength;
    }

    if (effect.widen) {
        x += side * reachX * effect.widen * strength;
    }

    if (effect.scaleX) {
        x = centerX + (x - centerX) * (1 + effect.scaleX * strength);
    }

    if (effect.scaleY) {
        y = centerY + (y - centerY) * (1 + effect.scaleY * strength);
    }

    return {
        ...point,
        x,
        y
    };
}

export function buildProcedureSimulationLandmarks(originalLandmarks, currentLandmarks, procedureId, options = {}) {
    const procedure = getProcedurePreset(procedureId);
    const intensity = Math.max(0.5, Math.min(1.6, options.intensity ?? procedure.intensity ?? 1));
    const width = options.width ?? originalLandmarks[0]?.x ?? 1;
    const height = options.height ?? originalLandmarks[0]?.y ?? 1;

    return originalLandmarks.map((orig, index) => {
        const current = currentLandmarks[index] ?? orig;
        let point = { ...current };

        procedure.effects.forEach(effect => {
    let weight = 0;

    const groupsArray = Array.isArray(effect.groups) ? effect.groups : [effect.groups];
    groupsArray.forEach(group => {
        if (pointInGroup(point, group)) {
            weight = Math.max(weight, 1);
        }
    });

    if (weight > 0) {
        point = applyEffect(point, effect, width, height, intensity, weight);
    }
});

        return point;
    });
}

export { PROCEDURE_PRESETS };
