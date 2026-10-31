import { qualifyAndroid } from "../../infra/rea-engine/android-capabilities.mjs";
const result = await qualifyAndroid();
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
