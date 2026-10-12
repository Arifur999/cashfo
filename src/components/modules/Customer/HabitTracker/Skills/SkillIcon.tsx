import { Brain, Briefcase, Calculator, Camera, ChefHat, Code, Dumbbell, GraduationCap, Languages, Music, Palette, PenLine, Sparkles } from "lucide-react";

// A switch, not a lookup table of components: a component picked from a table
// inside a render is exactly what React's "components created during render"
// lint rule forbids.
export function SkillIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case "code":
      return <Code className={className} />;
    case "palette":
      return <Palette className={className} />;
    case "music":
      return <Music className={className} />;
    case "languages":
      return <Languages className={className} />;
    case "camera":
      return <Camera className={className} />;
    case "dumbbell":
      return <Dumbbell className={className} />;
    case "pen":
      return <PenLine className={className} />;
    case "calculator":
      return <Calculator className={className} />;
    case "brain":
      return <Brain className={className} />;
    case "chef":
      return <ChefHat className={className} />;
    case "briefcase":
      return <Briefcase className={className} />;
    case "graduation":
      return <GraduationCap className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}
