/**
 * Lore page strings — English
 * @author songshan.li (ID: 17099618)
 */
export const lore = {
  'lore.heading': 'Lore RAG',
  'lore.subheading': 'Vector retrieval · Lore Q&A · Knowledge import',
  'lore.tabAsk': 'Ask',
  'lore.tabImport': 'Import',
  'lore.tabSearch': 'Search',
  'lore.tabArchive': 'Archive',
  'lore.tabMemory': 'Memory',
  'lore.session': 'Session',
  'lore.sessionHint': 'RAG Q&A over the lore library',
  'lore.awaiting': 'AWAITING QUERY',
  'lore.awaitingHint': 'Try: "Who is the protagonist\'s master?" or "What factions exist in the world?"',
  'lore.user': 'USER',
  'lore.bot': 'LORE_BOT',
  'lore.askFailed': 'Q&A failed',
  'lore.question': 'Question',
  'lore.questionPlaceholder': 'Ask the lore library, Enter to send',
  'lore.title': 'Title',
  'lore.titlePlaceholder': 'e.g. Sword Sect rules',
  'lore.content': 'Content',
  'lore.contentPlaceholder': 'Multi-paragraph text supported; will be chunked and vectorized...',
  'lore.import': 'Import',
  'lore.importing': 'Importing',
  'lore.imported': 'Imported to lore library',
  'lore.titleRequired': 'Please enter title and content',
  'lore.importFailed': 'Import failed',
  'lore.importResult': 'Import result',
  'lore.query': 'Query',
  'lore.queryPlaceholder': 'Enter search keywords...',
  'lore.search': 'Search',
  'lore.queryRequired': 'Please enter a query',
  'lore.searchFailed': 'Search failed',
  'lore.hits': 'Hits',
  'lore.hitsAwaiting': 'Hits will render here',
  'lore.keywordPlaceholder': 'Keyword *',
  'lore.categoryPlaceholder': 'Category (General/Faction/Geo)',
  'lore.descPlaceholder': 'Description...',
  'lore.archiveHint': 'Same keyword overwrites',
  'lore.archiveList': 'Saved lore',
  'lore.keywordRequired': 'Please enter a keyword',
  'lore.archiveSaved': 'Saved',
  'lore.saveFailed': 'Save failed',
  'lore.archiveEmpty': 'No entries · Click "Refresh" to load from backend',
  'lore.memoryTitle': 'Long-term memory · Characters',
  'lore.memoryHint': 'Auto-extracted by LongTermMemoryExtractor after chapter save',
  'lore.memoryEmpty': 'Characters will be auto-extracted after you save a chapter',
  'lore.architectureTitle': 'Memory architecture',
  'lore.architecture': `Short-term  →  ChatMemoryProvider (20-msg window)  →  Chapter Agent / Writing Assistant
   ↓ exceeds token-budget (6000)
Compress  →  ContextCompactor (reuse PolishAgent for summary)  →  ~3000
   ↓ on chapter save
Extract  →  LongTermMemoryExtractor (@Async)  →  novel_character table
   ↓ before chapter generation
Recall  →  RelevantMemoryRetriever (characters + timeline + RAG)  →  inject prompt`,
};
