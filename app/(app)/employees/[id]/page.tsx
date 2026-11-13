import { DetailPage } from "@/components/page-kit";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <DetailPage kind="employee" id={(await params).id} />; }
