const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Digital Logics Studio API",
      version: "1.0.0",
      description:
        "REST API for Digital Logics Studio — handles authentication and user progress tracking.",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local development server",
      },
      {
        url: "https://digital-logics-studio-backend.vercel.app",
        description: "Production server",
      },
    ],
    components: {
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", example: "664f1a2b3c4d5e6f7a8b9c0d" },
            name: { type: "string", example: "Saad Amin" },
            email: { type: "string", example: "saad@example.com" },
            solvedProblems: {
              type: "array",
              items: { type: "integer" },
              example: [1, 3, 7],
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ProblemProgress: {
          type: "object",
          properties: {
            problemId: { type: "integer", example: 5 },
            title: { type: "string", example: "Half Adder" },
            tags: {
              type: "array",
              items: { type: "string" },
              example: ["Combinational", "Arithmetic"],
            },
            topicId: { type: "string", example: "arithmetic" },
            subject: {
              type: "string",
              enum: ["dld", "coal"],
              example: "dld",
            },
            status: {
              type: "string",
              enum: ["not_started", "attempted", "solved"],
              example: "solved",
            },
            attempts: { type: "integer", example: 2 },
            openedAt: { type: "string", format: "date-time", nullable: true },
            lastAttemptAt: { type: "string", format: "date-time", nullable: true },
            solvedAt: { type: "string", format: "date-time", nullable: true },
          },
        },
        TopicProgress: {
          type: "object",
          properties: {
            topicId: { type: "string", example: "boolean-algebra" },
            title: { type: "string", example: "Boolean Algebra" },
            subject: {
              type: "string",
              enum: ["dld", "coal"],
              example: "dld",
            },
            status: {
              type: "string",
              enum: ["not_started", "in_progress", "completed"],
              example: "in_progress",
            },
            openedAt: { type: "string", format: "date-time", nullable: true },
            completedAt: { type: "string", format: "date-time", nullable: true },
            completionPercentage: { type: "integer", example: 50 },
            completedSubtopics: {
              type: "array",
              items: { type: "string" },
              example: ["boolean-laws"],
            },
            totalSubtopics: { type: "integer", example: 8 },
          },
        },
        ActivityDay: {
          type: "object",
          properties: {
            dateKey: { type: "string", example: "2026-06-01" },
            attempts: { type: "integer", example: 3 },
            solved: { type: "integer", example: 1 },
            topicsCompleted: { type: "integer", example: 0 },
            topicsOpened: { type: "integer", example: 1 },
          },
        },
        ActivityLog: {
          type: "object",
          required: ["userId", "action", "timestamp"],
          properties: {
            id: { type: "string", example: "log_664f1a2b3c4d5e6f7a8b9c0d" },
            userId: { type: "string", example: "664f1a2b3c4d5e6f7a8b9c0d" },
            action: { 
              type: "string", 
              enum: ["problem_attempted", "problem_solved", "topic_opened", "topic_completed"],
              example: "problem_solved" 
            },
            details: {
              type: "object",
              properties: {
                problemId: { type: "integer", example: 5 },
                topicId: { type: "string", example: "boolean-algebra" },
                subject: { type: "string", example: "dld" }
              }
            },
            timestamp: { type: "string", format: "date-time" }
          }
        },
        RecentEvent: {
          type: "object",
          properties: {
            id: { type: "string", example: "problem_solved-1710739200000-ab12cd" },
            type: {
              type: "string",
              enum: ["problem_attempted", "problem_solved", "topic_opened", "topic_completed"],
              example: "problem_solved",
            },
            createdAt: { type: "string", format: "date-time" },
            problemId: { type: "integer", nullable: true },
            topicId: { type: "string", nullable: true },
            subtopicId: { type: "string", nullable: true },
            title: { type: "string", example: "Half Adder" },
          },
        },
        ProgressState: {
          type: "object",
          properties: {
            problems: {
              type: "object",
              additionalProperties: { $ref: "#/components/schemas/ProblemProgress" },
            },
            topics: {
              type: "object",
              additionalProperties: { $ref: "#/components/schemas/TopicProgress" },
            },
            activity: {
              type: "object",
              additionalProperties: { $ref: "#/components/schemas/ActivityDay" },
            },
            recentEvents: {
              type: "array",
              items: { $ref: "#/components/schemas/RecentEvent" },
            },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            stack: {
              type: "string",
              description: "Only present in development mode",
            },
          },
        },
      },
      // Note: auth uses httpOnly cookies — no Bearer token needed in Swagger.
      // The /api/auth/login endpoint sets the cookie automatically.
      // To test protected routes in Swagger UI, first call /api/auth/login,
      // then the browser session cookie will be forwarded on subsequent requests
      // (works when Swagger UI is on the same origin as the API).
    },
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
