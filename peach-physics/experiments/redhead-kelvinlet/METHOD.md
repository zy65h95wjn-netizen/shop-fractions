# Formulation and controls

This implements **two-dimensional** regularized Kelvinlets, not a 3D kernel sampled at z=0. Coordinates and displacement are in original JPEG pixels.

## Primary sources

Fernando de Goes and Doug L. James, *Regularized Kelvinlets: Sculpting Brushes based on Fundamental Solutions of Elasticity*, ACM TOG 36(4), Article 40, SIGGRAPH 2017, DOI [10.1145/3072959.3073595](https://doi.org/10.1145/3072959.3073595).

- [Stanford publication page](https://graphics.stanford.edu/~djames/publication/kelvinlets/).
- [Requested paper URL](https://graphics.pixar.com/library/Kelvinlets/paper.pdf). This legacy URL returned an HTML page during implementation; the paper was read from [Pixar's current research PDF](https://research.pixar.com/docs/2017.SiggraphPapers.GJ.pdf).
- [Supplement](https://research.pixar.com/docs/2017.SiggraphPapers.GJ_suppl.a.pdf), Section B, particularly Equations 14 and 15.

## 2D Green tensor and affine load

Use $r=(x,y)^T$, $s=r^Tr+\epsilon^2$, $a=1/(4\pi\mu)$, $b=a/[4(1-\nu)]$. Paper Section 8, Equation 25 is

$$K_\epsilon(r)=\left[(b-a)\log(s)+a\epsilon^2/s\right]I+(2b/s)rr^T.$$

Equation 26 applies the affine load $F\in\mathbb R^{2\times2}$:

$$u_\epsilon(r)=-2a(1/s+\epsilon^2/s^2)Fr
+(2b/s)(F+F^T+\operatorname{tr}(F)I)r
-(4b/s^2)(r^TFr)r.$$

The code implements this expression directly in [`affine2D`](kelvinlet.js), with a row-major 2×2 force matrix. Equivalently, $(u_\epsilon)_k=\sum_{ij}F_{ij}\partial_j(K_\epsilon)_{ki}$. For a symmetric, trace-free matrix, this agrees with supplement B Equation 14, and the center gradient is $4(b-a)F/\epsilon^2$ (supplement Equation 15).

We choose a vertical pinch: contraction in y and neighboring expansion in x. No custom radial annulus or delayed bulge is added. This is a planar, infinitesimal elastic response; it does not establish 3D volume preservation, or even exact area preservation after finite warping.

## Long-range behavior and normalization

The single-scale 2D Green tensor contains a logarithmic term; its affine derivative still has an O(1/r) tail. Section 5's three-scale weights, explicitly extended to 2D in Section 8, are:

$$\epsilon_1=28,\quad\epsilon_2=1.1\epsilon_1,\quad\epsilon_3=1.1\epsilon_2,$$
$$w_1=1,\quad w_2=-\frac{\epsilon_3^2-\epsilon_1^2}{\epsilon_3^2-\epsilon_2^2},\quad w_3=\frac{\epsilon_2^2-\epsilon_1^2}{\epsilon_3^2-\epsilon_2^2}.$$

Thus $\sum w_i=0$ and $\sum w_i\epsilon_i^2=0$. The compound affine field decays as O(1/r⁵), the spatial derivative of the paper's O(1/r⁴) tri-scale 2D translation kernel. We sum the affine fields before normalizing; we do not normalize the three terms separately.

With $c=4(b-a)\sum_iw_i/\epsilon_i^2$, set $F=\operatorname{diag}(1,-1)/c$. The resulting compound center gradient is diag(+1,−1). Use μ=1 and ν=0.4; because we normalize the gradient, μ is not a fitted tissue stiffness.

The applied scalar strength is $0.35q$, where $q=\text{contact}-(8/9)\text{impact.v}$. This is exactly the original signed pressure history factored from $0.08\text{impact.v}-0.09\text{contact}$. It uses the existing contact and rebound state and no new temporal solver. The original prototype's unused `bulge` state remains inherited for trajectory identity, but does not drive B.

Parameters were fixed before visual evaluation. The 28px radius, paper-default scale ratio 1.1, and center-strain amplitude were selected once; no visual preference search was performed.

## A, A+, and shared composition

- **A:** calls the original `Physics.velocity(...,'A')` and `Physics.field('A')` from the unchanged `redhead-soft-tissue/physics.js` at starting commit `0e9f3a1`. No retuning.
- **A+:** copies A's bulk field, pressure function, total-velocity soft cap and six-step masked backtrace. Only the scalar multiplying localized pressure changes.
- **B:** uses that same bulk field, cap and backtrace, replacing localized pressure with the compound 2D affine Kelvinlet.

One `Comparison` instance feeds all panels. Its input, `step`, nodes, damping, followers, contact and impact state are inherited without overrides. The original 65% center / 35% local spring blend is retained in B, unlike the previous experiment. The existing cap is applied to total velocity in all methods; its nonlinear coupling is included in the measured contact contribution rather than ignored.

The original 17px inward mask, center boundary, source coordinates, 2px displacement lattice, six-increment mask backtrace and exact contour guard remain. WebGL uses a 1/1024px encoded displacement texture and samples the immutable photo. Canvas samples the same photo bilinearly at source resolution before viewport scaling. No accumulated texture resampling or replacement layers are used.

**The masked final map is not an exact infinite-medium elasticity solution.** The Kelvinlet is the analytically verified contact field; the protected-region envelope, interpolation, velocity cap and backtrace alter its final strain. We measure the complete map, not just the unmasked formula.

## Strength matching

Per side, per frame:

1. Evaluate the common zero-pressure bulk map and B's masked inverse map.
2. Inside a 14px contact disk, measure RMS magnitude of **B minus bulk** on the 2px field lattice. This avoids letting ordinary spring translation dominate the match; the exact contact center alone is unsuitable because affine pinch displacement is zero there.
3. Bisect A+'s pressure multiplier in [1,8] for 15 iterations to match that RMS. Neither pressure sign/history nor bulk spring state changes. Bounds are exposed in diagnostics.
4. Independently measure matching error at offset sample locations using final guard-weighted, interpolated maps. Also retain vector RMS residual: isotropic A+ pressure and anisotropic B cannot match direction, by design.

Matching measures strength, not visible quality. It does not assert equal peak displacement, equal affected area or equal local strain. The diagnostic JSON includes the residuals and gain bounds.

## Final-composition safeguards and limits

The inherited velocity cap and compact mask bound motion. A per-frame sampled guard suppresses both candidate methods to A if either candidate's final-map determinant falls below 0.20 or its strain materially exceeds A (see `Comparison.fields`). It does not alter spring state, and a suppression is exposed in diagnostics. No suppression occurred in the measured deterministic sequence.

The guard does **not** repair A's inherited boundary strain: doing so would violate the requirement to preserve A exactly and change the controlled bulk warp. Absolute excessive-strain failures are reported even when all modes share them. Sampled guards are not a formal guarantee over every subpixel location or arbitrary injected state.

## Independent verification

- [`tests/math.mjs`](tests/math.mjs): finite-difference contraction of Eq.25 versus Eq.26; independent supplement Eq.14 evaluation; normalized center gradient; multi-scale moment cancellation; far-field decay.
- [`tests/measure.mjs`](tests/measure.mjs): exact A field identity and all 2,640 spring/contact snapshots, contact matching, full composed inverse-map derivatives, displacement, forward principal stretches and symmetric shear.
- [`tests/refine.mjs`](tests/refine.mjs): 120 Hz temporal and 1px spatial refinement around the worst stronger-tap interval.
- [`tests/local.mjs`](tests/local.mjs): signed compression/expansion in the final masked hold pose, not just the analytical field.
- [`tests/validation.cjs`](tests/validation.cjs): real browser multitouch, near-boundary rendered pixels, exact restoration, mobile focus, context loss and blind-interface behavior.

For inverse sampling map $\phi(p)=p+d(p)$, $J=I+\nabla d$ is the **inverse** deformation gradient. Forward principal stretches are reciprocals of J's singular values; forward shear is taken from the symmetric part of $J^{-1}-I$. Positive det(J) is the tested orientation-preservation condition. Finite differences include the final guard and WebGL field quantization.
