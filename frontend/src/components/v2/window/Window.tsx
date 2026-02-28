function Window() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-8 shadow-lg">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Translation & annotation platform
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
          Work with Tibetan texts using parallel text editing, real-time collaboration,
          and comprehensive annotation tools. Designed for translators and scholars.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-center gap-2">
            <span className="text-cyan-500 dark:text-cyan-400">✓</span> Parallel text editing
          </li>
          <li className="flex items-center gap-2">
            <span className="text-cyan-500 dark:text-cyan-400">✓</span> Real-time collaboration
          </li>
          <li className="flex items-center gap-2">
            <span className="text-cyan-500 dark:text-cyan-400">✓</span> Annotation tools
          </li>
          <li className="flex items-center gap-2">
            <span className="text-cyan-500 dark:text-cyan-400">✓</span> Review workflow
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Window
