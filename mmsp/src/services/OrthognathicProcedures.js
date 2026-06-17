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

export const DEFAULT_PROCEDURE_ID = 'mandibular_advancement';

export function getProcedurePreset(procedureId) {
    return PROCEDURE_PRESETS.find(preset => preset.id === procedureId) ?? PROCEDURE_PRESETS[0];
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
