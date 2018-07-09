const randBox = (size:number) => {
  const minX = Math.random() * (100 - size),
    minY = Math.random() * (100 - size),
    minZ = Math.random() * (100 - size);
  return {
    minX, minY, minZ,
    maxX: minX + size * Math.random(),
    maxY: minY + size * Math.random(),
    maxZ: minZ + size * Math.random(),
  };
};

export const genData = (N:number, size:number) => {
  const data = [];
  for (let i = 0; i < N; i++) {
    data.push(randBox(size));
  }
  return data;
};

export const convertTo2d = (data:any[]) => data.map((bbox:any) => ({
  minX: bbox.minX,
  minY: bbox.minY,
  maxX: bbox.maxX,
  maxY: bbox.maxY,
}));
