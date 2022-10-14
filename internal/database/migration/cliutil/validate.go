package cliutil

import (
	"context"

	"github.com/urfave/cli/v2"

	"github.com/sourcegraph/sourcegraph/internal/oobmigration"
	"github.com/sourcegraph/sourcegraph/lib/output"
)

func Validate(commandName string, factory RunnerFactory, outFactory OutputFactory) *cli.Command {
	schemaNamesFlag := &cli.StringSliceFlag{
		Name:  "db",
		Usage: "The target `schema(s)` to validate. Comma-separated values are accepted. Supply \"all\" to validate all schemas.",
		Value: cli.NewStringSlice("all"),
	}
	skipOutOfBandMigrationsFlag := &cli.BoolFlag{
		Name:  "skip-out-of-band-migrations",
		Usage: "Do not attempt to validate out-of-band migration status.",
		Value: false,
	}

	action := makeAction(outFactory, func(ctx context.Context, cmd *cli.Context, out *output.Output) error {
		schemaNames, err := sanitizeSchemaNames(schemaNamesFlag.Get(cmd))
		if err != nil {
			return err
		}
		if len(schemaNames) == 0 {
			return flagHelp(out, "supply a schema via -db")
		}
		r, err := setupRunner(ctx, factory, schemaNames...)
		if err != nil {
			return err
		}

		if err := r.Validate(ctx, schemaNames...); err != nil {
			return err
		}

		out.WriteLine(output.Emoji(output.EmojiSuccess, "schema okay!"))

		if !skipOutOfBandMigrationsFlag.Get(cmd) {
			db, err := extractDatabase(ctx, r)
			if err != nil {
				return err
			}

			if err := oobmigration.ValidateOutOfBandMigrationRunner(ctx, db, outOfBandMigrationRunner(db)); err != nil {
				return err
			}

			out.WriteLine(output.Emoji(output.EmojiSuccess, "oobmigrations okay!"))
		}

		return nil
	})

	return &cli.Command{
		Name:        "validate",
		Usage:       "Validate the current schema",
		Description: ConstructLongHelp(),
		Action:      action,
		Flags: []cli.Flag{
			schemaNamesFlag,
			skipOutOfBandMigrationsFlag,
		},
	}
}
