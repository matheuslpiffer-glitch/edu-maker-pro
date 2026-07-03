import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listAssessments from "./tools/list-assessments";
import listQuestionBanks from "./tools/list-question-banks";
import listStudentResults from "./tools/list-student-results";

// Build issuer from the project ref inlined at build time so this module stays
// import-safe (no runtime env read at module top level).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "educreator-pro-mcp",
  title: "EduCreator Pro MCP",
  version: "0.1.0",
  instructions:
    "Tools for EduCreator Pro. Use list_assessments, list_question_banks, and list_student_results to read the signed-in teacher's data. Row Level Security scopes results to the authenticated user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listAssessments, listQuestionBanks, listStudentResults],
});