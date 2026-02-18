export function argsConverter() {
  return process.argv.slice(2).reduce(
    (acc, arg) => {
      // only split on the first = to avoid unexpected truncation of values
      const tempArgArr = arg.split(/=(.*)/, 2);
      if (tempArgArr[1]) {
        tempArgArr[1] = tempArgArr[1].replace(/(^('|")|('|")$)/g, "");
      }
      acc[tempArgArr[0].replace("--", "")] = tempArgArr[1];
      return acc;
    },
    {} as Record<string, any>,
  );
}
