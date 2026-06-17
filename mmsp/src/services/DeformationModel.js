export class DeformationModel {

    static applyDeformation(point, movedLandmarks, maxInfluenceDistance = 200) {
        let totalWeight = 0;
        let displacementX = 0;
        let displacementY = 0;
        let displacementZ = 0;

        movedLandmarks.forEach(landmark => {
            const { original, current, stiffness = 0.5, type = 'soft', importance = 1.0 } = landmark;

            const dx = point.x - original.x;
            const dy = point.y - original.y;
            const dz = (point.z || 0) - (original.z || 0);
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance > maxInfluenceDistance) return;

            const landmarkDx = current.x - original.x;
            const landmarkDy = current.y - original.y;
            const landmarkDz = (current.z || 0) - (original.z || 0);

            // Keep the original inverse-distance falloff shape.
            const falloffExponent = 1.5 + stiffness;
            let weight = Math.pow(1 - (distance / maxInfluenceDistance), falloffExponent);

            // Optional hard-tissue constraint. Existing hard-tissue behavior is preserved.
            if (type === 'hard') {
                weight *= 0.6;
            }

            weight *= importance;

            displacementX += landmarkDx * weight;
            displacementY += landmarkDy * weight;
            displacementZ += landmarkDz * weight;
            totalWeight += weight;
        });

        if (totalWeight > 0) {
            return {
                ...point,
                x: point.x + (displacementX / totalWeight),
                y: point.y + (displacementY / totalWeight),
                z: (point.z || 0) + (displacementZ / totalWeight)
            };
        }

        return { ...point };
    }

    static deformPoints(points, originalLandmarks, currentLandmarks, maxInfluenceDistance) {
    const movedLandmarks = originalLandmarks.map((orig, idx) => {
        const curr = currentLandmarks[idx];
        return {
            original: { x: orig.x, y: orig.y, z: orig.z || 0 },
            current: { x: curr.x, y: curr.y, z: curr.z || 0 },
            stiffness: orig.stiffness || 0.5,
            type: orig.type || 'soft',
            importance: orig.importance ?? curr.importance ?? 1.0
        };
    }).filter(lm => {
        const dx = lm.current.x - lm.original.x;
        const dy = lm.current.y - lm.original.y;
        const dz = lm.current.z - lm.original.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz) > 0.5;
    });
    if (movedLandmarks.length === 0) {
        return points.map(p => ({ ...p }));
    }
    return points.map(point =>
        this.applyDeformation(point, movedLandmarks, maxInfluenceDistance || 200)
    );
}
    static getInfluenceDistance(width, height) {
        const avgDimension = (width + height) / 2;
        return avgDimension * 0.4;
    }
}
