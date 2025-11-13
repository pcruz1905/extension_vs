grammar SellhubLiquid

// Entry point
entry Model:
    elements+=Element*;

// Top-level elements
Element:
    LiquidTag | LiquidOutput | TextContent;

// Text content (HTML, plain text, etc.)
// Accepts TEXT_CONTENT terminal and other tokens that appear in HTML outside Liquid delimiters
// Includes all tokens that might appear in HTML/prose (symbols, keywords, literals)
TextContent:
    parts+=(TEXT_CONTENT | STRING | ID | NUMBER | BOOLEAN |
            // Keywords that can appear in prose/HTML
            KW_NOT | KW_AND | KW_OR | KW_AS | KW_FOR | KW_IN | KW_WITH |
            KW_IF | KW_ELSE | KW_ELSIF | KW_ENDIF | KW_UNLESS | KW_ENDUNLESS |
            KW_CASE | KW_WHEN | KW_ENDCASE |
            KW_BREAK | KW_CONTINUE | KW_REVERSED |
            KW_COMMENT | KW_ENDCOMMENT | KW_RAW | KW_ENDRAW |
            KW_CAPTURE | KW_ENDCAPTURE | KW_LIQUID | KW_ENDLIQUID |
            KW_ECHO | KW_RENDER | KW_INCLUDE |
            // Symbols (for HTML, CSS, prose, etc.)
            OP_LT | OP_GT | OP_EQ | OP_NEQ | OP_GTE | OP_LTE | EQUALS | COLON | DOT | COMMA |
            LPAREN | RPAREN | LBRACK | RBRACK | LBRACE | RBRACE | PIPE)+;

// Liquid tags ({% %})
LiquidTag:
    ControlFlowTag | IterationTag | VariableTag | TemplateTag | IslandTag | SimpleLiquidTag;

// Placeholder for simple tags we'll implement later
// NOTE: This catches unknown tags but should NOT match block keywords (elsif, else, when, endfor, etc.)
// Those are handled by their respective block rules
SimpleLiquidTag:
    TAG_START name=ID TAG_END;

// Control flow tags (Phase 2)
ControlFlowTag:
    IfTag | UnlessTag | CaseTag;

IfTag:
    TAG_START KW_IF condition=Expression TAG_END
    (content+=IfContentElement)*
    (elsifBlocks+=ElsifBlock (elsifContent+=IfContentElement)*)*
    (elseBlock=ElseBlock (elseContent+=IfContentElement)*)?
    TAG_START KW_ENDIF TAG_END;

// Content elements that can appear inside if/elsif/else blocks
// Includes ALL tags and content (nested ifs are allowed!)
IfContentElement:
    IfTag | UnlessTag | CaseTag | IterationTag | VariableTag | TemplateTag | IslandTag | SimpleLiquidTag | LiquidOutput | TextContent;

ElsifBlock:
    TAG_START KW_ELSIF condition=Expression TAG_END;

ElseBlock:
    {infer ElseBlock} TAG_START KW_ELSE TAG_END;

UnlessTag:
    TAG_START KW_UNLESS condition=Expression TAG_END
    (content+=IfContentElement)*
    (elseBlock=ElseBlock (elseContent+=IfContentElement)*)?
    TAG_START KW_ENDUNLESS TAG_END;

CaseTag:
    TAG_START KW_CASE value=Expression TAG_END
    (whenBlocks+=WhenBlock (whenContent+=IfContentElement)*)+
    (elseBlock=ElseBlock (elseContent+=IfContentElement)*)?
    TAG_START KW_ENDCASE TAG_END;

WhenBlock:
    TAG_START KW_WHEN values+=Expression (COMMA values+=Expression)* TAG_END;

// Iteration tags (Phase 3)
IterationTag:
    ForTag | TableRowTag | CycleTag | BreakTag | ContinueTag;

ForTag:
    TAG_START KW_FOR variable=ID KW_IN collection=Expression
    (params+=ForParameter)*
    (reversed?=KW_REVERSED)?
    TAG_END
    content+=Element*
    elseBlock=ForElseBlock?
    TAG_START KW_ENDFOR TAG_END;

ForParameter:
    name=(KW_LIMIT | KW_OFFSET) COLON value=(NUMBER | ID | KW_CONTINUE);

ForElseBlock:
    TAG_START KW_ELSE TAG_END
    content+=Element*;

TableRowTag:
    TAG_START KW_TABLEROW variable=ID KW_IN collection=Expression
    (params+=TableRowParameter)*
    TAG_END
    content+=Element*
    TAG_START KW_ENDTABLEROW TAG_END;

TableRowParameter:
    name=(KW_COLS | KW_LIMIT | KW_OFFSET) COLON value=(NUMBER | ID);

CycleTag:
    TAG_START KW_CYCLE (group=(STRING | ID) COLON)? values+=CycleValue (COMMA values+=CycleValue)* TAG_END;

CycleValue:
    value=(STRING | ID);

BreakTag:
    {infer BreakTag} TAG_START KW_BREAK TAG_END;

ContinueTag:
    {infer ContinueTag} TAG_START KW_CONTINUE TAG_END;

// Variable tags (Phase 4)
VariableTag:
    AssignTag | CaptureTag | IncrementTag | DecrementTag;

AssignTag:
    TAG_START KW_ASSIGN variable=ID EQUALS value=Expression TAG_END;

CaptureTag:
    TAG_START KW_CAPTURE variable=ID TAG_END
    content+=Element*
    TAG_START KW_ENDCAPTURE TAG_END;

IncrementTag:
    TAG_START KW_INCREMENT variable=ID TAG_END;

DecrementTag:
    TAG_START KW_DECREMENT variable=ID TAG_END;

// Template tags (Phase 4)
TemplateTag:
    CommentTag | RawTag | LiquidInlineTag | EchoTag | RenderTag | IncludeTag;

// NOTE: These template tags require context-aware lexing which Langium doesn't fully support
// Comment/Raw/Liquid blocks currently use IfContentElement* as a workaround
CommentTag:
    TAG_START KW_COMMENT TAG_END
    (content+=IfContentElement)*
    TAG_START KW_ENDCOMMENT TAG_END;

RawTag:
    TAG_START KW_RAW TAG_END
    (content+=IfContentElement)*
    TAG_START KW_ENDRAW TAG_END;

// NOTE: Liquid tag is typically used without endliquid, but we'll support both syntaxes
LiquidInlineTag:
    TAG_START KW_LIQUID (content+=IfContentElement)* (TAG_START KW_ENDLIQUID)? TAG_END;

EchoTag:
    TAG_START KW_ECHO expression=Expression TAG_END;

RenderTag:
    TAG_START KW_RENDER template=(STRING | ID)
    (COMMA params+=RenderParameter)*
    (renderMode=RenderMode)?
    TAG_END;

RenderParameter:
    key=ID COLON value=Expression;

RenderMode:
    (KW_WITH | KW_FOR) object=Expression (KW_AS alias=ID)?;

IncludeTag:
    TAG_START KW_INCLUDE template=(STRING | ID)
    (COMMA params+=RenderParameter)*
    (includeMode=IncludeMode)?
    TAG_END;

IncludeMode:
    (KW_WITH | KW_FOR) object=Expression (KW_AS alias=ID)?;

// Islands (Phase 5)
IslandTag:
    TAG_START KW_ISLAND name=(STRING | ID)
    (COMMA KW_PROPS COLON props=PropsObject)?
    (COMMA KW_HYDRATE COLON hydrate=STRING)?
    TAG_END
    content+=Element*
    TAG_START KW_ENDISLAND TAG_END;

PropsObject:
    LBRACE (properties+=Property (COMMA properties+=Property)*)? RBRACE;

Property:
    key=ID COLON value=Expression;

// Liquid output ({{ }})
LiquidOutput:
    OUTPUT_START wsLeft=('-')? expression=Expression wsRight=('-')? OUTPUT_END;

// Expression system (Phase 1 - Core)
Expression:
    LogicalOrExpression;

LogicalOrExpression:
    LogicalAndExpression ({infer BinaryExpression.left=current} operator=KW_OR right=LogicalAndExpression)*;

LogicalAndExpression:
    ComparisonExpression ({infer BinaryExpression.left=current} operator=KW_AND right=ComparisonExpression)*;

ComparisonExpression:
    UnaryExpression ({infer BinaryExpression.left=current}
        operator=(OP_EQ | OP_NEQ | OP_GTE | OP_LTE | OP_GT | OP_LT | KW_CONTAINS)
        right=UnaryExpression)?;

UnaryExpression:
    {infer UnaryExpression} operator=KW_NOT? operand=PrimaryExpression;

PrimaryExpression:
    FilteredExpression | ParenOrRangeExpression;

ParenOrRangeExpression:
    LPAREN first=Expression (range=RangePart)? RPAREN;

RangePart:
    RANGE end=Expression;

FilteredExpression:
    base=BaseExpression (filters+=Filter)*;

BaseExpression:
    Literal | ArrayLiteral | ObjectLiteral | PropertyAccess;

// Property access: object.property or array[0] or nested
PropertyAccess:
    base=ID accessors+=Accessor*;

Accessor:
    DotAccess | BracketAccess;

DotAccess:
    DOT property=ID;

BracketAccess:
    LBRACK index=AccessorIndex RBRACK;

AccessorIndex:
    value=(NUMBER | STRING | ID);

// Filters
Filter:
    PIPE name=ID (COLON args+=FilterArgument (COMMA args+=FilterArgument)*)?;

// Filter arguments can be either positional or named
// Positional: filter: "value", 100
// Named: filter: width: 100, height: 200
FilterArgument:
    (name=ID COLON)? value=FilterArgumentValue;

FilterArgumentValue:
    Expression;

// Literals
Literal:
    value=(STRING | NUMBER | BOOLEAN);

// Array literal: [1, 2, 3] or ["a", "b"] or [product.id, product.title]
ArrayLiteral:
    LBRACK (elements+=Expression (COMMA elements+=Expression)*)? RBRACK;

// Object literal: { key: value, key2: value2 }
ObjectLiteral:
    LBRACE (properties+=ObjectProperty (COMMA properties+=ObjectProperty)*)? RBRACE;

ObjectProperty:
    key=ID COLON value=Expression;

// Terminals - ORDER MATTERS!

// 1. Liquid delimiters (must come FIRST to prevent TEXT_CONTENT from eating them!)
terminal OUTPUT_START: '{{';
terminal OUTPUT_END: '}}';
terminal TAG_START: '{%';
terminal TAG_END: '%}';

// 2. Keywords (must come before ID!)
// IMPORTANT: Longer keywords MUST come before shorter ones that are prefixes!
// IMPORTANT: Keywords use negative lookahead to prevent matching identifier prefixes (e.g., "forloop")
terminal KW_ENDTABLEROW: /endtablerow(?![_a-zA-Z0-9-])/;
terminal KW_ENDUNLESS: /endunless(?![_a-zA-Z0-9-])/;
terminal KW_ENDCOMMENT: /endcomment(?![_a-zA-Z0-9-])/;
terminal KW_ENDCAPTURE: /endcapture(?![_a-zA-Z0-9-])/;
terminal KW_ENDISLAND: /endisland(?![_a-zA-Z0-9-])/;
terminal KW_ENDLIQUID: /endliquid(?![_a-zA-Z0-9-])/;
terminal KW_INCREMENT: /increment(?![_a-zA-Z0-9-])/;
terminal KW_DECREMENT: /decrement(?![_a-zA-Z0-9-])/;
terminal KW_ENDCASE: /endcase(?![_a-zA-Z0-9-])/;
terminal KW_CONTAINS: /contains(?![_a-zA-Z0-9-])/;
terminal KW_CONTINUE: /continue(?![_a-zA-Z0-9-])/;
terminal KW_TABLEROW: /tablerow(?![_a-zA-Z0-9-])/;
terminal KW_REVERSED: /reversed(?![_a-zA-Z0-9-])/;
terminal KW_HYDRATE: /hydrate(?![_a-zA-Z0-9-])/;
terminal KW_INCLUDE: /include(?![_a-zA-Z0-9-])/;
terminal KW_CAPTURE: /capture(?![_a-zA-Z0-9-])/;
terminal KW_COMMENT: /comment(?![_a-zA-Z0-9-])/;
terminal KW_ENDRAW: /endraw(?![_a-zA-Z0-9-])/;
terminal KW_ENDFOR: /endfor(?![_a-zA-Z0-9-])/;
terminal KW_ENDIF: /endif(?![_a-zA-Z0-9-])/;
terminal KW_UNLESS: /unless(?![_a-zA-Z0-9-])/;
terminal KW_ISLAND: /island(?![_a-zA-Z0-9-])/;
terminal KW_LIQUID: /liquid(?![_a-zA-Z0-9-])/;
terminal KW_OFFSET: /offset(?![_a-zA-Z0-9-])/;
terminal KW_RENDER: /render(?![_a-zA-Z0-9-])/;
terminal KW_ASSIGN: /assign(?![_a-zA-Z0-9-])/;
terminal KW_ELSIF: /elsif(?![_a-zA-Z0-9-])/;
terminal KW_PROPS: /props(?![_a-zA-Z0-9-])/;
terminal KW_LIMIT: /limit(?![_a-zA-Z0-9-])/;
terminal KW_CYCLE: /cycle(?![_a-zA-Z0-9-])/;
terminal KW_BREAK: /break(?![_a-zA-Z0-9-])/;
terminal KW_ELSE: /else(?![_a-zA-Z0-9-])/;
terminal KW_CASE: /case(?![_a-zA-Z0-9-])/;
terminal KW_WHEN: /when(?![_a-zA-Z0-9-])/;
terminal KW_WITH: /with(?![_a-zA-Z0-9-])/;
terminal KW_COLS: /cols(?![_a-zA-Z0-9-])/;
terminal KW_ECHO: /echo(?![_a-zA-Z0-9-])/;
terminal KW_FOR: /for(?![_a-zA-Z0-9-])/;
terminal KW_RAW: /raw(?![_a-zA-Z0-9-])/;
terminal KW_AND: /and(?![_a-zA-Z0-9-])/;
terminal KW_NOT: /not(?![_a-zA-Z0-9-])/;
terminal KW_OR: /or(?![_a-zA-Z0-9-])/;
terminal KW_AS: /as(?![_a-zA-Z0-9-])/;
terminal KW_IF: /if(?![_a-zA-Z0-9-])/;
terminal KW_IN: /in(?![_a-zA-Z0-9-])/;

// 3. Operators and symbols (before TEXT_CONTENT)
// Comparison operators (2-char operators MUST come before 1-char!)
terminal OP_EQ: '==';
terminal OP_NEQ: '!=';
terminal OP_GTE: '>=';
terminal OP_LTE: '<=';
terminal OP_GT: '>';
terminal OP_LT: '<';
// RANGE must come before DOT to prevent .. from being tokenized as two dots
terminal RANGE: '..';
terminal PIPE: '|';
terminal DOT: '.';
terminal COMMA: ',';
terminal COLON: ':';
terminal EQUALS: '=';
terminal LPAREN: '(';
terminal RPAREN: ')';
terminal LBRACK: '[';
terminal RBRACK: ']';
terminal LBRACE: '{';
terminal RBRACE: '}';


// 4. String literals (must come before ID to handle quoted strings)
terminal STRING: /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/;

// 5. Numbers
terminal NUMBER returns number: /-?[0-9]+(\.[0-9]+)?/;

// 6. Booleans (must come before ID since they look like identifiers)
terminal BOOLEAN returns boolean: /true|false/;

// 7. Identifiers (before TEXT_CONTENT for Liquid expressions)
terminal ID: /[_a-zA-Z][_a-zA-Z0-9-]*/;

// 8. Inline comments (hidden)
hidden terminal INLINE_COMMENT: /{%\s*#[^\n]*%}/;

// 9. Whitespace (hidden)
hidden terminal WS: /[ \t\r\n]+/;

// 10. Text content - MUST BE LAST! (catches everything not matched above)
// Matches: any character sequence that's not a Liquid delimiter start
// This includes: plain text, HTML tags, quoted strings in HTML attributes, etc.
// Note: This will match more greedily than STRING terminal when outside Liquid tags
terminal TEXT_CONTENT: /([^{]|{(?![{%]))+/;
