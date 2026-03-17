import { redirect } from "next/navigation";

export default function ProjectFinanceRedirect({ params }: { params: { id: string } }) {
  redirect(`/admin/project-finance/${params.id}`);
}
