import DashboardLayout from "@/components/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BookOpen, User, Clock, Target, Mail, Github, Youtube, Star, Code, Cpu, FileText } from "lucide-react";

const teamMembers = [
  {
    name: "Huynh Ba Thanh",
    id: "105029615",
    role: "TEAM MEMBER",
    initials: "HT",
    avatar: "/images/thanh.jpg",
    topColor: "bg-[hsl(142,71%,45%)]",
    responsibilityIcon: FileText,
    responsibilities: "Data Processing & Dataset Preparation for IEEE, PaySim, and ULB, Frontend Support",
  },
  {
    name: "Le Thanh Nam",
    id: "104999380",
    role: "LEADER",
    initials: "LN",
    avatar: "/images/nam.jpg",
    topColor: "bg-[hsl(45,93%,47%)]",
    responsibilityIcon: Cpu,
    responsibilities: "ML Implementation (Logistic Regression/GRU), Model Evaluation, Backend, AI Integration",
  },
  {
    name: "Nguyen Hai Dang",
    id: "105680423",
    role: "TEAM MEMBER",
    initials: "ND",
    avatar: "/images/dang.jpg",
    topColor: "bg-[hsl(213,94%,55%)]",
    responsibilityIcon: Code,
    responsibilities: "Model Evaluation Metrics, Frontend Support",
  },
  {
    name: "Ho Cao Cuong",
    id: "105687343",
    role: "TEAM MEMBER",
    initials: "HC",
    avatar: "/images/cuong.jpg",
    topColor: "bg-[hsl(270,60%,55%)]",
    responsibilityIcon: Cpu,
    responsibilities: "ML Implementation (Isolation Forest/XGBoost), Backend Support",
  },
];

const unitDetails = [
  { icon: BookOpen, label: "UNIT", value: "Computing Technology Innovation Project (COS30049)" },
  { icon: User, label: "LECTURER", value: "Hoang (Arthur) Nguyen" },
  { icon: Clock, label: "CLASS TIME", value: "1:00 PM Tuesday" },
  { icon: Target, label: "PROJECT FOCUS", value: "Web Development, AI Model Integration, Data Visualization, Error Handling & Input Validation" },
];

export default function AboutUs() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header - Centered */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Sentinel AI
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Assignment 3_Full-Stack Web Development for AI Application in Cybersecurity Scenarios
          </p>
        </div>

        {/* Unit Details Card */}
        <div className="glass-card rounded-lg p-6 hover:shadow-md transition-shadow">
          <h2 className="text-base font-bold text-foreground mb-5">Unit Details</h2>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {unitDetails.map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">
                      {item.label}
                    </p>
                    <p className="text-sm font-medium text-foreground">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 shrink-0">
              <a
                href="https://github.com/HCMComputingTechnologyInnovationProject/assignment3-hcmc1-8.git"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-3 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Github className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-[10px] opacity-80 leading-none">View Source Code</div>
                  <div className="font-semibold leading-tight">GitHub Repository</div>
                </div>
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-3 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                <Youtube className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-[10px] opacity-80 leading-none">Watch Demo</div>
                  <div className="font-semibold leading-tight">YouTube Video</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-6 text-center">Meet The Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="glass-card rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Colored top bar */}
                <div className={`h-1.5 ${member.topColor}`} />

                <div className="p-5 flex flex-col items-center text-center flex-1">
                  {/* Avatar */}
                  <Avatar className="h-16 w-16 mb-3">
                    <AvatarImage src={member.avatar} alt={member.name} className="object-cover" />
                    <AvatarFallback className="bg-secondary text-foreground text-lg font-semibold">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name & ID */}
                  <p className="text-sm font-bold text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">ID: {member.id}</p>

                  {/* Role badge */}
                  <Badge
                    className={`mt-2 ${
                      member.role === "LEADER"
                        ? "bg-[hsl(45,93%,47%)] text-foreground border-transparent text-[10px]"
                        : "bg-secondary text-secondary-foreground border-transparent text-[10px]"
                    }`}
                  >
                    {member.role === "LEADER" && <Star className="h-3 w-3 mr-1" />}
                    {member.role}
                  </Badge>

                  {/* Email */}
                  <div className="flex items-center gap-1.5 mt-4 text-xs text-primary">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{member.id}@student.swin.edu.au</span>
                  </div>

                  {/* Responsibilities */}
                  <div className="w-full border-t border-border mt-4 pt-4">
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <member.responsibilityIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide">
                        Responsibilities
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {member.responsibilities}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
