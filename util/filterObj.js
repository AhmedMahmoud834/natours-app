const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  if (!obj) return newObj;
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

export default filterObj;
