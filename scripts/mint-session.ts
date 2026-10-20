import { createSessionToken } from "../lib/session";

createSessionToken(new Date()).then((token) => console.log(token));
