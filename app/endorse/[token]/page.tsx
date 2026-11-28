import EndorsementPortal from "@/components/ui/EndorsementPortal";

export default async function EndorsementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <EndorsementPortal token={token} />;
}
