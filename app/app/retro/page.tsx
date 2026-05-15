import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RetroPage() {
  return (
    <div className="container max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Weekly retrospective</CardTitle>
          <CardDescription>
            Coming next — wins, struggles, lessons, and a synthesis back. Phase
            4 of the build.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
