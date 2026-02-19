import { User, Star, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Mentor } from "@/lib/useAllMentors";

interface MentorCardProps {
  mentor: any;
}

export default function MentorCard({ mentor }: MentorCardProps) {
  return (
    <Card className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="p-0">
        <div className="aspect-[4/3] relative overflow-hidden bg-muted flex items-center justify-center">
          {mentor.image && !mentor.image.includes('pravatar.cc') ? (
            <img 
              src={mentor.image} 
              alt={mentor.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-magenta-400 flex items-center justify-center">
              <User className="w-20 h-20 text-white/80 drop-shadow-lg" />
            </div>
          )}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {mentor.rating}
            <span className="text-muted-foreground font-normal">({mentor.reviewCount})</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-3">
        <div>
          <h3 className="font-heading font-bold text-lg leading-tight group-hover:text-primary transition-colors">
            {mentor.name}
          </h3>
          <p className="text-sm text-muted-foreground font-medium">
            {mentor.title} at {mentor.company}
          </p>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {mentor.bio}
        </p>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {mentor.expertise.slice(0, 3).map((skill: string) => (
            <Badge key={skill} variant="secondary" className="text-xs font-medium bg-secondary/30 text-secondary-foreground hover:bg-secondary/50 border-transparent">
              {skill}
            </Badge>
          ))}
          {mentor.expertise.length > 3 && (
            <Badge variant="outline" className="text-xs text-muted-foreground border-transparent bg-muted">
              +{mentor.expertise.length - 3}
            </Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-5 pt-0 flex items-center justify-between border-t border-border/50 mt-auto bg-muted/10">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Rate</span>
          <span className="font-bold text-lg">${mentor.hourlyRate}<span className="text-sm font-normal text-muted-foreground">/hr</span></span>
        </div>
        <Link href={`/mentor/${mentor.id}`}>
          <Button className="gap-2 group-hover:bg-primary group-hover:text-primary-foreground">
            View Profile <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
