# Animation Flow Diagram for Atila Reservas

```mermaid
graph TD
    A[User Enters Dashboard] --> B[Page Entrance Animation]
    B --> C[Tabs Component]
    C --> D[Tab 1: Reservas]
    C --> E[Tab 2: Finanzas]
    C --> F[Tab 3: Papelera]
    C --> G[Tab 4: Configuración]
    
    D --> H[Calendar Component]
    H --> H1[Month Navigation]
    H --> H2[Calendar Days]
    H2 --> H2A[Day Hover Effect]
    H2 --> H2B[Day Selection Animation]
    H2 --> H2C[Status Color Transitions]
    
    D --> I[Reservation Form]
    I --> I1[Form Field Focus]
    I --> I2[Button Interactions]
    I --> I3[Form Submission]
    
    D --> J[Reservations List]
    J --> J1[List Item Hover]
    J --> J2[Delete Animation]
    
    E --> K[Financial Charts]
    E --> L[Expense Entries]
    L --> L1[Entry Hover Effect]
    
    F --> M[Trash Items]
    M --> M1[Item Restore Animation]
    
    G --> N[Configuration Options]
    N --> N1[Save Button Feedback]
    
    O[Dialog Components] --> P[Reservation Details Dialog]
    P --> P1[Dialog Entrance]
    P --> P2[Content Staggered Reveal]
    
    Q[Loading States] --> R[Skeleton Loaders]
    Q --> S[Progress Indicators]
    
    T[Micro-interactions] --> U[Button Press]
    T --> V[Checkbox Selection]
    T --> W[Toast Notifications]
```

## Animation Timing and Easing

```mermaid
graph LR
    A[Easing Functions] --> B[Standard Transition<br/>200ms ease-out]
    A --> C[Entrance Animation<br/>300ms ease-out-expo]
    A --> D[Exit Animation<br/>200ms ease-in]
    A --> E[Bounce Effect<br/>400ms cubic-bezier<br/>0.34, 1.56, 0.64, 1]
```

## Component Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant Calendar
    participant Form
    participant Dialog
    participant List
    
    User->>Calendar: Hover over day
    Calendar->>Calendar: Scale up 5% with transition
    User->>Calendar: Click on day
    Calendar->>Calendar: Pulse animation
    Calendar->>Form: Populate date field
    Form->>Form: Field highlight animation
    User->>Form: Fill form fields
    User->>Form: Submit form
    Form->>Form: Button loading spinner
    Form->>List: New reservation added
    List->>List: Staggered entrance animation
    User->>Calendar: Click on day with reservations
    Calendar->>Dialog: Open with scale-in animation
    Dialog->>Dialog: Content fade-in staggered