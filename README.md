# Orca 

![Orca](https://i.imgur.com/cPCbEmv.png)

Download your Reddit data:
- Upvoted
- Saved
- Submissions
- Comments

This data is written to `.txt` files in the `--output-dir`, default is `${PWD}/orca-output/`

## Help

```terminal
npx @mortond/orca -h
```

## Usage

![Orca](./demo.gif)

```terminal
npx @mortond/orca --data=upvoted,saved,comments,submissions \
--output-dir=orca-output \
--client-id=FlF8aEgpYa_LNw \
--client-secret=z1KNAUb_c0MF7hGyR8lfHCQjnzJtGw \
--access-token=70162531-eWBggyupUsdf1cz7u-G9pM_dhrVf3g
```

### Install globally

```terminal
npm i @mortond/orca -g
orca -h
```