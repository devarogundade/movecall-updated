# MoveCall Indexer

This indexer is used to cache the on-chain state of the MoveCall registry to a database,
in order to unlock more composite queries (e.g. query all delegators for a given operator).

## Setting up locally

Copy `.env.sample` to `.env` and fill the variables (for DB connection).
This sample environment setup works with Mainnet types.

- `BACKFILL_PROGRESS_FILE_PATH`: Expects a file in the format `{ "deeplayer_indexing": <starting_checkpoint> }`
- `CHECKPOINTS_DIR`: Make sure an empty directory exists on that path.
