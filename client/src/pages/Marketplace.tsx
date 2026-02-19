import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import MentorCard from "@/components/mentor/MentorCard";
import { useAllMentors } from "@/lib/useAllMentors";
import { useAuth } from "@/lib/authStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dial } from "@/components/ui/dial";
import { ScrollWheelSelector } from "@/components/ui/scroll-wheel";
import { Search, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const TOPICS = [
  "Coding", "Tech Careers", "Design", "Business", "Data Science", 
  "Entrepreneurship", "Branding", "App Design", "Machine Learning",
  "Mathematics", "Physics", "Biology", "Chemistry", "Engineering", "Robotics"
];

export default function Marketplace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(300);
  const { user } = useAuth();
  const { mentors: allMentors, isLoading } = useAllMentors(user?.id);

  const filteredMentors = allMentors.filter(mentor => {
    const matchesSearch = mentor.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          mentor.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          mentor.expertise.some(e => e.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTopic = selectedTopics.length === 0 || 
                         mentor.expertise.some(e => selectedTopics.includes(e));

    const matchesPrice = mentor.hourlyRate <= maxPrice;

    return matchesSearch && matchesTopic && matchesPrice;
  }).sort((a, b) => {
    // Sort by recommendation score (overlap with user interests)
    if (!user?.interests || user.interests.length === 0) return 0;
    
    const getScore = (m: any) => {
      const mentorExpertise = m.expertise.map((e: string) => e.toLowerCase());
      return user.interests!.filter(interest => 
        mentorExpertise.includes(interest.toLowerCase())
      ).length;
    };

    return getScore(b) - getScore(a);
  });

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic) 
        : [...prev, topic]
    );
  };

  const Filters = () => (
    <div className="space-y-8 pr-2">
      <div className="flex flex-col gap-4">
        <h3 className="font-bold">Price Filter</h3>
        <div className="space-y-4">
          <div className="relative group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">$</span>
            <Input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="pl-7 h-11 bg-card/50 border-border focus:border-primary/50 transition-all font-medium"
              placeholder="Enter max price..."
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[50, 100, 200, 500].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setMaxPrice(suggestion)}
                  className="text-[10px] px-2 py-1 rounded bg-muted/50 hover:bg-primary/20 hover:text-primary transition-colors uppercase tracking-wider font-bold"
                >
                  ${suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Expertise</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-[10px] uppercase tracking-tighter"
            onClick={() => setSelectedTopics([])}
          >
            Clear
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Add custom..."
            className="pl-8 h-8 text-xs bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val && !selectedTopics.includes(val)) {
                  toggleTopic(val);
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
          />
        </div>

        <ScrollWheelSelector
          options={TOPICS}
          selectedOptions={selectedTopics}
          onToggle={toggleTopic}
        />
        
        {selectedTopics.filter(t => !TOPICS.includes(t)).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedTopics.filter(t => !TOPICS.includes(t)).map(customTopic => (
              <Button
                key={customTopic}
                variant="secondary"
                size="sm"
                className="h-7 text-xs px-2 py-0"
                onClick={() => toggleTopic(customTopic)}
              >
                {customTopic} ×
              </Button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-bold mb-4">Availability</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="today" />
            <Label htmlFor="today" className="cursor-pointer">Available Today</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="week" />
            <Label htmlFor="week" className="cursor-pointer">Available This Week</Label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Mobile Filter Trigger */}
          <div className="md:hidden flex gap-2 mb-4">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search mentors..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto">
                <div className="mt-8">
                  <Filters />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 flex-shrink-0 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pr-2 scroll-smooth scrollbar-thin scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/30">
            <Filters />
          </aside>

          {/* Main Content */}
          <main className="flex-1">
             <div className="hidden md:block relative mb-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, title, or company..." 
                  className="pl-10 h-12 text-lg shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

            <div className="mb-6 flex justify-between items-center">
              <h1 className="text-2xl font-bold font-heading">
                {filteredMentors.length} {filteredMentors.length === 1 ? 'Mentor' : 'Mentors'} Found
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Sort by: <span className="font-medium text-foreground cursor-pointer">Recommended</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMentors.map(mentor => (
                <MentorCard key={mentor.id} mentor={mentor} />
              ))}
              
              {isLoading && (
                <div className="col-span-full py-12 text-center">
                  <p className="text-muted-foreground">Loading mentors...</p>
                </div>
              )}
              
              {!isLoading && filteredMentors.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-muted rounded-xl">
                  <h3 className="text-lg font-bold mb-2">No mentors found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
                  <Button 
                    variant="link" 
                    onClick={() => {setSearchTerm(""); setSelectedTopics([]);}}
                    className="mt-2 text-primary"
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
