class PCFGError extends Error {
  constructor(...args: any[]) {
    super(...args);

    this.name = "PCFGError";
  }
}

export { PCFGError };
