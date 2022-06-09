const getDateString = () => {
  const dateObj = new Date();
  return dateObj.toISOString().split("T")[0];
};

export default getDateString;
