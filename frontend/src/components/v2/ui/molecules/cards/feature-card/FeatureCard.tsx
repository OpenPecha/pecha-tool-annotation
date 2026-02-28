import { BookOpen, Users, Zap, Eye, FileText } from "lucide-react"

const features = [
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: "Text Annotation",
    description: "Annotate Tibetan texts with precision and ease",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Collaborative",
    description: "Work together with reviewers and annotators",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Fast & Efficient",
    description: "Streamlined workflow for maximum productivity",
  },
  {
    icon: <Eye className="w-6 h-6" />,
    title: "Review System",
    description: "Quality control through structured review process",
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: "Parallel Editing",
    description: "Edit source and target text side by side",
  },
]

function FeatureCard() {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Features
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 hover:border-cyan-500/50 dark:hover:border-cyan-400/50 transition-colors"
          >
            <div className="flex flex-col space-y-3">
              <div className="p-3 w-fit rounded-lg bg-cyan-500/10 dark:bg-cyan-400/10 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500/20 dark:group-hover:bg-cyan-400/20 transition-colors">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FeatureCard
