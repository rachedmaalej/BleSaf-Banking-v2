# Research Notes: LLM-Powered Dashboards and AI Interface Design

## Source 1: Yellowbrick - Conversational Analytics with LLMs
URL: https://yellowbrick.com/blog/data-platform/how-large-language-models-llms-unlock-self-service-analytics-from-questions-to-dashboards/

### Key Concept: From Questions to Dashboards

**The Promise**: Users can ask databases questions in plain English and get answers immediately, along with dashboards to visualize them.

**Core Capabilities**:

1. **Natural Language Querying**
   - Non-technical users ask: "What was my revenue in Ohio in March 2025?"
   - LLM explores database schemas, describes tables, assembles correct queries
   - Returns answer within seconds without requiring SQL knowledge

2. **Contextual Conversation**
   - LLM maintains context across follow-up questions
   - Analysis follows natural conversation flow
   - Each answer leads to next question organically
   - Eliminates ticket requests and static reports

3. **Blending Structured & Unstructured Data**
   - LLM accesses vector stores with unstructured documents (PDFs, wikis, policies)
   - Reads unstructured content, understands rules, applies to structured data
   - Example: Discovers "loyalty-adjusted effective revenue" formula in document and applies it to database

4. **On-Demand Visualization**
   - User asks: "Can you give me this in a visual format?"
   - Model generates interactive dashboard on the spot
   - Compares metrics, breaks down by dimensions, shows rankings
   - Flow: Question → Query → Business Rules → Visualization

**Business Impact**:
- Empowers business users without technical training
- Accelerates insights from days to minutes
- Unlocks analyst productivity for strategic work
- Enables agile decision-making

**Technical Requirements**:
- Database must handle ad-hoc, unpredictable queries
- No need for pre-built indexes or aggregates
- High performance at scale for complex joins
- Predictable costs despite query variability

---

## Source 2: Smashing Magazine - AI Interface Design Patterns
URL: https://www.smashingmagazine.com/2025/07/design-patterns-ai-interfaces/

### Key Shift: The Receding Role of AI Chat

**Traditional Chat is Fading**: When AI agents can use multiple tools and run in background, users *orchestrate* AI work rather than chat back and forth.

**Why Chat is Problematic**:
- Burden of articulating intent lies on user
- Remarkably difficult to do well
- Very time-consuming (30-60 seconds for input)
- Users get lost in editing, reviewing, typing, re-typing

**New Paradigm: Task-Oriented UIs**
- Temperature controls, knobs, sliders, buttons
- Semantic spreadsheets, infinite canvases
- AI provides predefined options, presets, templates
- Emphasizes the work, the plan, the tasks — the outcome

### Five Key Areas for AI Experience Design

#### 1. Input UX: Expressing Intent

**Minimize Typing Burden**:
- AI-generated pre-prompts (ask AI to write prompts for itself)
- Prompt extensions and query builders
- Voice input

**Visual Intent Expression**:
- Node-based interfaces (Flora AI): Connect sources visually instead of writing prompts
- Abstract shape manipulation (Krea.ai): Move shapes to explain goals, AI interprets
- Canvas-based orchestration

#### 2. Output UX: Displaying Outcomes

**Beyond Text and Bullets**:
- Visualize through "style lenses" (e.g., Sad-Happy, Concrete-Abstract scales)
- Map visualizations for geographic data
- Data layers users can toggle on/off
- Structured formats (tables, dashboards, JSON)

**Avoid Choice Paralysis**:
- Use forced ranking and prioritization
- Suggest best options even when user asks for top 10
- Present results in format appropriate to use case

#### 3. Refinement UX: Tweaking Output

**Most Painful Part of Experience**:
- Users need to cherry-pick bits from output
- Expand sections, synthesize, refine

**Solutions**:
- UI controls: knobs, sliders, buttons (Adobe Firefly approach)
- Presets and bookmarks
- Highlight specific parts for contextual editing
- Contextual prompts acting on highlighted sections vs. global prompts

**Advanced Actions**:
- Initiate tasks AI can perform (scheduling, planning, research)
- Sort and filter results
- Transform between formats
- Share to Slack, Jira, etc.

#### 4. AI Integration: Where Work Happens

**Key Insight**: AI should integrate where actual work happens, not in dedicated AI section.

**Examples**:
- Slack, Teams, Jira, GitHub integrations
- Browser extensions
- Embedded in existing workflows

**Philosophy**: Be "AI-second" not "AI-first"
- Focus on user needs first
- Sprinkle AI where it adds value
- Enhance existing mental models rather than replace them

#### 5. Interaction Paradigms

**Minimize Cost of Interaction**:
- Direct manipulation (tapping, clicking, selecting, highlighting)
- Bookmarking points of interest
- Avoid forcing users through text box for everything

---

## Key Insights for BleSaf Dashboard

### 1. Conversational Analytics Layer
- Bank managers should be able to ask: "Why is Branch Lac 2's SLA so low?"
- LLM analyzes data across dimensions (service type, teller efficiency, time patterns)
- Provides natural language explanation with supporting data

### 2. Predictive Intelligence
- "When will Branch X likely breach SLA today?"
- "Which branches will need additional staff tomorrow based on historical patterns?"
- Proactive recommendations before problems occur

### 3. Task Orchestration
- Instead of chat: "Open 2 counters at Branch Lac 2"
- Use action buttons with AI-calculated impact estimates
- AI runs simulations in background, presents options

### 4. Visual Intent Expression
- Drag-and-drop interface for resource allocation
- Visual capacity planning with AI optimization
- Interactive "what-if" scenarios with immediate feedback

### 5. Contextual Insights
- AI maintains context of manager's investigation
- Follow-up questions build on previous analysis
- Seamless flow from high-level to granular detail

### 6. Blended Data Intelligence
- Combine queue data with unstructured sources (staff notes, customer feedback, policy docs)
- LLM understands business rules and applies them to operational data
- Holistic view beyond just numbers

### 7. On-Demand Visualization
- "Show me branch performance as a heatmap"
- "Compare top 5 vs bottom 5 branches visually"
- AI generates appropriate visualizations based on request

### 8. Embedded Intelligence
- AI insights appear contextually where needed
- Not a separate "AI chat" section
- Integrated into existing dashboard workflow
