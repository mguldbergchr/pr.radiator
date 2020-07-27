const sortByCreatedAt = (a: any, b: any) => {
  if (a.createdAt < b.createdAt) {
    return -1;
  }
  if (a.createdAt > b.createdAt) {
    return 1;
  }
  return 0;
}

export default sortByCreatedAt;
