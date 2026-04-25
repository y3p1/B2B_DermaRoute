import ApiDocsClient from "../../components/api-docs/ApiDocsClient";
import EnvVarStatus from "../../components/api-docs/EnvVarStatus";

export default function ApiDocumentationPage() {
  return (
    <main style={{ maxWidth: 900, margin: "2rem auto", padding: 24 }}>
      <h1>API Documentation</h1>
      <EnvVarStatus />
      <ApiDocsClient />
    </main>
  );
}
