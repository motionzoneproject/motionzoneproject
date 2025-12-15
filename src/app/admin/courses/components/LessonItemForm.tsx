import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LessonWithBookings } from "@/lib/actions/admin";

interface Props {
  lesson: LessonWithBookings;
}

export default function LessonItemForm({ lesson }: Props) {
  return (
    <div className="space-y-4">
      {" "}
      Meddelande:
      <br />
      <Textarea></Textarea>
      <div className="flex gap-2">
        <Checkbox className="w-6 h-6" />
        <Label>Inställd</Label>
      </div>
      <Input type="hidden" name="id" value={lesson.id}></Input>
      <Button>Spara</Button>
    </div>
  );
}
