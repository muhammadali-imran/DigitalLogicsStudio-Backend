/**
 * One-time migration: copy the embedded problemProgress, topicProgress,
 * activityLog, and recentEvents arrays off old User documents and into
 * the new UserProgress collection.
 *
 * Usage:
 *   node src/scripts/migrateProgress.js            (dry run — logs only)
 *   node src/scripts/migrateProgress.js --write     (actually creates docs)
 *   node src/scripts/migrateProgress.js --write --cleanup
 *       (also strips the old embedded fields off the User docs afterward)
 *
 * Safe to re-run: any user that already has a UserProgress document is
 * skipped, so running it twice won't duplicate or overwrite data.
 *
 * IMPORTANT: run this against your DB *before* deploying the updated
 * User.js / progressController.js / authMiddleware.js — those files no
 * longer read the embedded arrays, so old data would otherwise become
 * unreachable (not deleted, just inaccessible through the app).
 */

require("dotenv").config();
const mongoose = require("mongoose");
const UserProgress = require("../src/models/UserProgress");

const WRITE = process.argv.includes("--write");
const CLEANUP = process.argv.includes("--cleanup");

async function migrate() {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing in environment variables");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected to MongoDB. Mode: ${WRITE ? "WRITE" : "DRY RUN"}${CLEANUP ? " + CLEANUP" : ""}`);

    // Use the raw driver collection, not the (now-slimmed) User model, so we
    // can still read the old embedded fields even though they're no longer
    // part of the Mongoose schema.
    const usersCollection = mongoose.connection.collection("users");

    const cursor = usersCollection.find({
        $or: [
            { problemProgress: { $exists: true, $ne: [] } },
            { topicProgress: { $exists: true, $ne: [] } },
            { activityLog: { $exists: true, $ne: [] } },
            { recentEvents: { $exists: true, $ne: [] } },
        ],
    });

    let migrated = 0;
    let skipped = 0;
    let errored = 0;
    const migratedUserIds = [];

    while (await cursor.hasNext()) {
        const user = await cursor.next();

        try {
            const existing = await UserProgress.findOne({ userId: user._id });
            if (existing) {
                skipped += 1;
                console.log(`Skip  ${user._id} (${user.email || "no email"}) — UserProgress already exists.`);
                continue;
            }

            const payload = {
                userId: user._id,
                problemProgress: user.problemProgress || [],
                topicProgress: user.topicProgress || [],
                activityLog: user.activityLog || [],
                recentEvents: user.recentEvents || [],
            };

            if (WRITE) {
                await UserProgress.create(payload);
            }

            migrated += 1;
            migratedUserIds.push(user._id);
            console.log(
                `${WRITE ? "Migrated" : "Would migrate"} ${user._id} (${user.email || "no email"}) — ` +
                `${payload.problemProgress.length} problems, ${payload.topicProgress.length} topics, ` +
                `${payload.activityLog.length} activity days, ${payload.recentEvents.length} events.`,
            );
        } catch (err) {
            errored += 1;
            console.error(`Error migrating user ${user._id}:`, err.message);
        }
    }

    console.log(
        `\nDone. Migrated: ${migrated}, Skipped (already existed): ${skipped}, Errors: ${errored}.`,
    );

    if (!WRITE) {
        console.log("This was a dry run — nothing was written. Re-run with --write to apply.");
    }

    if (WRITE && CLEANUP && migrated > 0) {
        console.log(`\nCleaning up embedded fields on ${migratedUserIds.length} migrated user(s)...`);
        const cleanupResult = await usersCollection.updateMany(
            { _id: { $in: migratedUserIds } },
            { $unset: { problemProgress: "", topicProgress: "", activityLog: "", recentEvents: "" } },
        );
        console.log(`Cleanup: removed embedded progress fields from ${cleanupResult.modifiedCount} users.`);
    } else if (WRITE && !CLEANUP) {
        console.log(
            "\nNot cleaning up old embedded fields (pass --cleanup to remove them once you've " +
            "verified the migrated data in UserProgress looks correct).",
        );
    }

    await mongoose.disconnect();
}

migrate()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Migration failed:", err);
        process.exit(1);
    });