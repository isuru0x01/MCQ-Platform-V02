import { AccordionComponent } from "@/components/homepage/accordion-component";
import BlogSample from "@/components/homepage/blog-samples";
import HeroSection from "@/components/homepage/hero-section";
import MarketingCards from "@/components/homepage/marketing-cards";
import Pricing from "@/components/homepage/pricing";
import SideBySide from "@/components/homepage/side-by-side";
import Search from "@/components/homepage/search"
import PageWrapper from "@/components/wrapper/page-wrapper";
import config from "@/config";

export default function Home() {
  return (
    <PageWrapper>
      <div className="flex flex-col justify-center items-center w-full mt-[1rem] py-1 p-3">
        <HeroSection />
      </div>
      {/* Reduce top margin only */}
      {/* <div className="flex mt-[4rem] mb-0 w-full justify-center items-center py-0 pb-0">
        <SideBySide />
      </div> */}
      {/* <div className="flex flex-col p-2 w-full justify-center items-center">
        <MarketingCards />
      </div> */}
      <div className="flex flex-col p-2 w-full justify-center items-center">
        <Search />
      </div>
      <div className="flex flex-col p-2 w-full justify-center items-center">
        <BlogSample />
      </div>
      <div>
        <Pricing />
      </div>
      {/* <div className="flex justify-center items-center w-full my-[8rem]">
        <AccordionComponent />
      </div> */}
    </PageWrapper>
  );
}