# Bitfinex Terminal for the CLI

Details coming soon

## Requirements

* Terminal with full Unicode support
* Font with full Unicode support
* Minimum 1920x1080 resolution (recommended)

## Configuring Credentials

For now, create a `.env` file in the project directory with two likes:

```bash
API_KEY=...
API_SECRET=...
```

Or provide them on the environment as `API_KEY` and `API_SECRET` when running
the terminal. If using the `.env` file, be sure to run from the same folder.

## Usage (pre-release)

```bash
git clone https://github.com/f3rno/bfx-terminal-cli
cd bfx-terminal-cli

npm i
npm link

echo 'API_KEY=...' » .env
echo 'API_SECRET=...' » .env

bfx-terminal-cli run tBTCUSD
```

### Commands

Full summary coming soon; the quick order size defaults to the minimum trade size
for the market, and is used for all order commands if no size is explicity
specified. Run `help` to show a list of available commands.

#### Priming

Primes are rules for executing orders at some point in the future, when relevant
conditions are met. Use them to trade with the market when large trades are seen,
or the price crosses a certain indicator.

Multiple prime rules can be configured simultaneously, but when one is triggered
the others are cancelled. Best used at moments of market indecision, when a break
through support or resistance is possible.

#### Trade Groups

Trade groups are comprised of the last consecutive buys or sells, the amounts of
which are summed for generated alerts when the sum exceeds the configured
threshold, or triggering prime rules. The active (direction same as last trade)
group is highlighted in the UI.

#### Preview

![preview](/readme_assets/preview.png)
