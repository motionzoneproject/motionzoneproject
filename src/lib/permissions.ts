// Detta är bara generiska just nu, vi får anpassa det till vår app sen. Gör en egen issue för det.

import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  adminAc,
  userAc,
} from "better-auth/plugins/admin/access";

const statement = {
  ...defaultStatements,
  project: ["create", "share", "update", "delete", "ban"],
} as const;

export const ac = createAccessControl(statement);

export const user = ac.newRole({
  ...userAc.statements,
});

export const admin = ac.newRole({
  project: ["create", "share", "update", "delete", "ban"],
  ...adminAc.statements,
});

export const instructor = ac.newRole({
  project: ["create", "update", "ban"],
  user: ["get", "list", "ban"],
});
