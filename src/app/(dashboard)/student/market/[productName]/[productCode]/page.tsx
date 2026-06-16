import { MarketProductDetailsPageView } from "@/features/campus-market/components/campus-market-experience";

type StudentMarketProductDetailsPageProps = {
  params: Promise<{
    productName: string;
    productCode: string;
  }>;
};

export default async function StudentMarketProductDetailsPage({
  params,
}: StudentMarketProductDetailsPageProps) {
  const { productName, productCode } = await params;

  return (
    <MarketProductDetailsPageView
      productName={productName}
      productCode={productCode}
    />
  );
}
