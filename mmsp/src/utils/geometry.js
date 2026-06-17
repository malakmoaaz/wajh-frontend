export class GeometryUtils {
  /**
   * Solves for Affine Transform Matrix (2x3) that maps src triangle to dst triangle.
   * Defined as:
   * x' = a*x + c*y + e
   * y' = b*x + d*y + f
   * 
   * @param {Array} src - [{x,y}, {x,y}, {x,y}]
   * @param {Array} dst - [{x,y}, {x,y}, {x,y}]
   * @returns {Object} {a, b, c, d, e, f}
   */
  static getAffineTransform(src, dst) {
    const x1 = src[0].x, y1 = src[0].y;
    const x2 = src[1].x, y2 = src[1].y;
    const x3 = src[2].x, y3 = src[2].y;

    const u1 = dst[0].x, v1 = dst[0].y;
    const u2 = dst[1].x, v2 = dst[1].y;
    const u3 = dst[2].x, v3 = dst[2].y;

    // We have two systems of linear equations.
    // System 1 for a, c, e:
    // x1*a + y1*c + 1*e = u1
    // x2*a + y2*c + 1*e = u2
    // x3*a + y3*c + 1*e = u3
    
    // System 2 for b, d, f:
    // x1*b + y1*d + 1*f = v1
    // ...

    // Use Cramer's rule or explicit inverse.
    // Det of the coordinate matrix:
    const det = x1*(y2 - y3) - y1*(x2 - x3) + (x2*y3 - x3*y2);

    if (Math.abs(det) < 1e-6) {
      // Degenerate triangle
      return {a:1, b:0, c:0, d:1, e:0, f:0};
    }

    const invDet = 1.0 / det;

    // Minors for inverse matrix
    const m11 = (y2 - y3) * invDet;
    const m12 = (y3 - y1) * invDet;
    const m13 = (y1 - y2) * invDet;
    
    const m21 = (x3 - x2) * invDet;
    const m22 = (x1 - x3) * invDet;
    const m23 = (x2 - x1) * invDet;
    
    const m31 = (x2*y3 - x3*y2) * invDet;
    const m32 = (x3*y1 - x1*y3) * invDet;
    const m33 = (x1*y2 - x2*y1) * invDet;

    // Apply inverse to target vector [u1, u2, u3] to get [a, c, e]
    const a = m11*u1 + m12*u2 + m13*u3;
    const c = m21*u1 + m22*u2 + m23*u3;
    const e = m31*u1 + m32*u2 + m33*u3;

    // Apply inverse to target vector [v1, v2, v3] to get [b, d, f]
    const b = m11*v1 + m12*v2 + m13*v3;
    const d = m21*v1 + m22*v2 + m23*v3;
    const f = m31*v1 + m32*v2 + m33*v3;

    return {a, b, c, d, e, f};
  }
}
