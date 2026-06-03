#!/usr/bin/env perl

use strict;
use warnings;
use JSON::PP;
use v5.16;

###############################################################################
###############################################################################

my $input    = "manifest.json";
my $json_str = file_get_contents($input);
my $x        = JSON::PP::decode_json($json_str);

my $ver_str  = "v" . ($x->{version} || "???");
my $out_file = "browser-addon-sgp-$ver_str.zip";

my $cmd = "zip -qr $out_file manifest.json icons/ popup/ src/";
system($cmd);

my $exit = $? >> 8;
if ($exit != 0) {
	#print "CMD: $cmd\n";
	die("ERROR: Something went wrong building the zip file\n");
}

my $size_str = -s ($out_file);
$size_str = human_size_c($size_str);

printf("Created %s - %s\n", color('white', $out_file), $size_str);

###############################################################################
###############################################################################

sub human_size_c {
	my $size = shift();
	if (!defined($size)) { return undef; }

	if    ($size >= (1024**5) * 0.98) { $size = sprintf("\e[38;5;167m%.1fP\e[0m", $size / 1024**5); }
	elsif ($size >= (1024**4) * 0.98) { $size = sprintf("\e[38;5;105m%.1fT\e[0m", $size / 1024**4); }
	elsif ($size >= (1024**3) * 0.98) { $size = sprintf("\e[38;5;45m%.1fG\e[0m" , $size / 1024**3); }
	elsif ($size >= (1024**2) * 0.98) { $size = sprintf("\e[38;5;47m%.1fM\e[0m" , $size / 1024**2); }
	elsif ($size >= 1024)             { $size = sprintf("\e[38;5;226m%.1fK\e[0m", $size / 1024);    }
	elsif ($size >= 0)                { $size = sprintf("\e[38;5;160m%dB\e[0m"  , $size);           }

	return $size;
}

# String format: '115', '165_bold', '10_on_140', 'reset', 'on_173', 'red', 'white_on_blue'
sub color {
	my ($str, $txt) = @_;

	if (-t STDOUT == 0 || $ENV{NO_COLOR}) { return $txt // ""; } # No interactive terminal
	if (!length($str) || $str eq 'reset') { return "\e[0m";    } # No string = RESET

	# Some predefined colors/commands
	my %color_map = qw(red 160 blue 27 green 34 yellow 226 orange 214 purple 93 white 15 black 0);
	my %cmd_map   = qw(bold 1 italic 3 underline 4 blink 5 inverse 7);

	# Pre-process the string.
	$str =~ s/on_/-/;                              # "on_" becomes a negative number
	$str =~ s|([A-Za-z]+)|$color_map{$1} // $1|eg; # command number

	my @parts = split("_", $str);
	foreach my $p (@parts) {
		my $cmd_num = $cmd_map{$p // 0};

		if    ($cmd_num)                      { $p = $cmd_num;  }
		elsif (defined($p) && $p =~ /^-(.+)/) { $p = "48;5;$p"; }
		elsif (defined($p))                   { $p = "38;5;$p"; }
	}

	my $ret = "\e[" . join(";", @parts) . "m";

	if (defined($txt)) { $ret .= $txt . "\e[0m"; }

	return $ret;
}

sub file_get_contents {
	open(my $fh, "<", $_[0]) or return undef;
	binmode($fh, ":encoding(UTF-8)");

	my $array_mode = ($_[1]) || (!defined($_[1]) && wantarray);

	if ($array_mode) { # Line mode
		my @lines  = readline($fh);

		# Right trim all lines
		foreach my $line (@lines) { $line =~ s/[\r\n]+$//; }

		return @lines;
	} else { # String mode
		local $/       = undef; # Input rec separator (slurp)
		return my $ret = readline($fh);
	}
}

sub file_put_contents {
	my ($file, $data) = @_;

	open(my $fh, ">", $file) or return undef;
	binmode($fh, ":encoding(UTF-8)");
	print $fh $data;
	close($fh);

	return length($data);
}

# Creates methods k() and kd() to print, and print & die respectively
BEGIN {
	if (!defined(&trim)) {
		*trim = sub {
			my ($s) = (@_, $_); # Passed in var, or default to $_
			if (length($s) == 0) { return ""; }
			$s =~ s/^\s*//;
			$s =~ s/\s*$//;

			return $s;
		}
	}

	if (eval { require Dump::Krumo }) {
		Dump::Krumo->import(qw/k kd/);
	} else {
		require Data::Dumper;
		*k  = sub { print Data::Dumper::Dumper(\@_) };
		*kd = sub { print Data::Dumper::Dumper(\@_); die; };
	}
}

# vim: tabstop=4 shiftwidth=4 noexpandtab autoindent softtabstop=4

