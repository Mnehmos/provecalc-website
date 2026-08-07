import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextVitals,
  {
    ignores: [".next/**", "api-sidecar/**", "node_modules/**"],
    rules: {
      // Existing client components intentionally synchronize local UI state
      // from external props/effects; keep the upgrade's new advisory rules
      // from turning the release lint gate into a false blocker.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
];
