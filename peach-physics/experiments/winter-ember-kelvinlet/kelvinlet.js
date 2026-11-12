// de Goes & James 2017, Section 8, Eqs. (25), (26); supplement B (14),(15).
// Strictly R² -> R². No evaluation of a 3D field at z=0.
export const parameters=Object.freeze({mu:1,nu:.4,epsilon:28,scaleRatio:1.1,strain:.35,contactRadius:14});
export function coefficients(mu=1,nu=.4){const a=1/(4*Math.PI*mu);return {a,b:a/(4*(1-nu))};}
// Eq. (25), row-major symmetric 2x2 Green tensor. s = r_epsilon².
export function kernel2D(x,y,epsilon,mu=1,nu=.4){
 const {a,b}=coefficients(mu,nu),s=x*x+y*y+epsilon*epsilon;
 const iso=(b-a)*Math.log(s)+a*epsilon*epsilon/s,k=2*b/s;
 return [iso+k*x*x,k*x*y,k*x*y,iso+k*y*y];
}
// Eq. (26): contraction sum_ij F_ij d_j K_ki, using row-major F.
export function affine2D(x,y,epsilon,F,mu=1,nu=.4){
 const {a,b}=coefficients(mu,nu),s=x*x+y*y+epsilon*epsilon;
 const fx=F[0]*x+F[1]*y,fy=F[2]*x+F[3]*y;
 const tx=F[0]*x+F[2]*y,ty=F[1]*x+F[3]*y;
 const tr=F[0]+F[3],quad=x*fx+y*fy;
 const c=-2*a*(1/s+epsilon*epsilon/(s*s)),d=2*b/s,e=4*b*quad/(s*s);
 return [c*fx+d*(fx+tx+tr*x)-e*x,c*fy+d*(fy+ty+tr*y)-e*y];
}
export function compoundScales(epsilon=parameters.epsilon,ratio=parameters.scaleRatio){
 const e=[epsilon,epsilon*ratio,epsilon*ratio*ratio],s=e.map(x=>x*x);
 return {e,w:[1,-(s[2]-s[0])/(s[2]-s[1]),(s[1]-s[0])/(s[2]-s[1])]};
}
export const compound=compoundScales();
export function compoundAffine(x,y,F){
 const out=[0,0];compound.e.forEach((e,i)=>{const u=affine2D(x,y,e,F,parameters.mu,parameters.nu);out[0]+=compound.w[i]*u[0];out[1]+=compound.w[i]*u[1];});return out;
}
// Supplement B Eq. (15) gives center Jacobian 4(b-a)/epsilon² * F.
// Normalize the COMPOUND field, not its individual terms, to diag(+1,-1).
const {a,b}=coefficients(parameters.mu,parameters.nu);
export const centerFactor=4*(b-a)*compound.e.reduce((sum,e,i)=>sum+compound.w[i]/(e*e),0);
export const unitPinchForce=Object.freeze([1/centerFactor,0,0,-1/centerFactor]);
export function pinch(x,y,strength){const v=compoundAffine(x,y,unitPinchForce);return [strength*v[0],strength*v[1]];}
