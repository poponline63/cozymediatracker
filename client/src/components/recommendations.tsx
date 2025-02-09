import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Recommendation {
  mediaId: string;
  title: string;
  type: string;
  posterUrl: string | null;
}

export default function Recommendations() {
  const { data: recommendations, isLoading } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations"],
  });

  if (isLoading || !recommendations?.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Recommended for You</h2>
      </div>
      <ScrollArea className="w-full whitespace-nowrap rounded-lg border">
        <div className="flex w-max space-x-4 p-4">
          {recommendations.map((item) => (
            <div key={item.mediaId} className="w-[150px]">
              <img
                src={item.posterUrl || ""}
                alt={item.title}
                className="w-full aspect-[2/3] rounded-lg object-cover"
              />
              <p className="mt-2 text-sm font-medium truncate">{item.title}</p>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}