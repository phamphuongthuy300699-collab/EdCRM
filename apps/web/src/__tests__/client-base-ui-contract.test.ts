import fs from "fs";import path from "path";import {describe,expect,it} from "vitest";
const read=(file:string)=>fs.readFileSync(path.resolve(process.cwd(),file),"utf8");
describe("client base UI",()=>{
 it("offers independent guardian and student creation",()=>{const guardians=read("src/app/(crm)/crm/guardians/page.tsx"),students=read("src/app/(crm)/crm/students/page.tsx");expect(guardians).toContain("Добавить родителя");expect(guardians).toContain("Ребёнка можно привязать позже");expect(students).toContain("Пока не указывать");expect(students).toContain("Родителя и группу можно добавить позже");});
 it("shows lifecycle filters and follow-up navigation",()=>{const guardians=read("src/app/(crm)/crm/guardians/page.tsx"),layout=read("src/app/(crm)/crm/CrmLayoutClient.tsx");expect(guardians).toContain("Не связываться");expect(guardians).toContain("Без детей");expect(layout).toContain("Повторные касания");});
 it("uses CrmDialog for mobile-compatible new workflows",()=>{expect(read("src/app/(crm)/crm/guardians/page.tsx")).toContain('<CrmDialog title="Добавить родителя"');expect(read("src/app/(crm)/crm/followups/page.tsx")).toContain("crm-followup-grid");});
});
