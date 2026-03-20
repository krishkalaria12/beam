declare module "react-reconciler/node_modules/react" {
  export * from "react";
  const React: typeof import("react");
  export default React;
}

declare module "react-reconciler/node_modules/react/jsx-runtime" {
  export * from "react/jsx-runtime";
}
