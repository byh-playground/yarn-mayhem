function vectorMatrixFor(x,y,scaleX,scaleY,rotation=0,originX=100,originY=100){
  const c=Math.cos(rotation),sn=Math.sin(rotation),a=c*scaleX,b=sn*scaleX,cc=-sn*scaleY,d=c*scaleY;
  return new Float32Array([a,b,cc,d,x-a*originX-cc*originY,y-b*originX-d*originY]);
}
function multiplyVectorMatrix(a,b){return new Float32Array([
  a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],
  a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5],
]);}

export { vectorMatrixFor, multiplyVectorMatrix };
