package main

import (
	"context"
	"flag"
	"fmt"
	"time"

	"github.com/peterbourgon/ff/v3/ffcli"
	"github.com/sourcegraph/sourcegraph/dev/sg/internal/generate"
	"github.com/sourcegraph/sourcegraph/dev/sg/internal/generate/gogen"
	"github.com/sourcegraph/sourcegraph/dev/sg/internal/stdout"
	"github.com/sourcegraph/sourcegraph/dev/sg/root"
	"github.com/sourcegraph/sourcegraph/lib/errors"
	"github.com/sourcegraph/sourcegraph/lib/output"
)

var (
	stdOut                = stdout.Out
	generateFlagSet       = flag.NewFlagSet("sg generate", flag.ExitOnError)
	generateGoFlagSet     = flag.NewFlagSet("sg generate go", flag.ExitOnError)
	generateGoVerboseFlag = generateGoFlagSet.Bool("v", false, "Display output from go generate")
	generateGoQuietFlag   = generateGoFlagSet.Bool("q", false, "Suppress all output but errors from go generate")

	generateCommand = &ffcli.Command{
		Name:       "generate",
		ShortUsage: "sg generate",
		FlagSet:    generateFlagSet,
		Exec: func(ctx context.Context, args []string) error {
			if len(args) > 0 {
				writeFailureLinef("unrecognized command %q provided", args[0])
				return flag.ErrHelp
			}
			var runner generate.Runner
			for _, g := range allGenerateTargets {
				if g.Name == args[0] {
					runner = g.Runner
				}
			}
			if runner == nil {
				return flag.ErrHelp
			}
			return runGenerateScriptAndReport(ctx, runner, args)
		},
		Subcommands: allGenerateTargets.Commands(),
	}
)

type generateTargets []generate.Target

var allGenerateTargets = generateTargets{
	{
		Name:    "go",
		Help:    "Run go generate [packages...] on the codebase",
		FlagSet: generateGoFlagSet,
		Runner:  generateGoRunner,
	},
}

func runGenerateScriptAndReport(ctx context.Context, runner generate.Runner, args []string) error {
	_, err := root.RepositoryRoot()
	if err != nil {
		return err
	}

	report := runner(ctx, args)
	fmt.Printf(report.Output)
	stdOut.WriteLine(output.Linef(output.EmojiSuccess, output.StyleSuccess, "(%ds)", report.Duration/time.Second))
	return report.Err
}

// Commands converts all lint targets to CLI commands
func (gt generateTargets) Commands() (cmds []*ffcli.Command) {
	execFactory := func(c generate.Target) func(context.Context, []string) error {
		return func(ctx context.Context, args []string) error {
			if len(args) > 0 {
				writeFailureLinef("unexpected argument %q provided", args[0])
				return flag.ErrHelp
			}
			return runGenerateScriptAndReport(ctx, c.Runner, args)
		}
	}
	for _, c := range gt {
		cmds = append(cmds, &ffcli.Command{
			Name:       c.Name,
			ShortUsage: fmt.Sprintf("sg generate %s", c.Name),
			ShortHelp:  c.Help,
			LongHelp:   c.Help,
			FlagSet:    c.FlagSet,
			Exec:       execFactory(c)})
	}
	return cmds
}

func generateGoRunner(ctx context.Context, args []string) *generate.Report {
	if *generateGoVerboseFlag && *generateGoQuietFlag {
		return &generate.Report{Err: errors.Errorf("-q and -v flags are exclusive")}
	}
	if *generateGoVerboseFlag {
		return gogen.Generate(ctx, args, gogen.VerboseOutput)
	} else if *generateGoQuietFlag {
		return gogen.Generate(ctx, args, gogen.QuietOutput)
	} else {
		return gogen.Generate(ctx, args, gogen.NormalOutput)
	}
}
