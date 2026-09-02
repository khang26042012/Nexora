
use strict;
use warnings;
my $file = $ARGV[0];
open(my $fh, '<', $file) or die $!;
my $content = do { local $/; <$fh> };
close($fh);
my %replaces = (
  '${VERSION_INPUT}' => '${{ inputs.version }}',
  '${VERSION_OUTPUT}' => '${{ steps.version.outputs.version }}',
  '${PRERELEASE}' => '${{ inputs.prerelease || false }}',
  '${GHA_TOKEN_SECRET}' => '${{ secrets.GITHUB_TOKEN }}',
);
for my $k (keys %replaces) {
  $content =~ s/Q$kE/$replaces{$k}/g;
}
open(my $out, '>', $file) or die $!;
print $out $content;
close($out);
print "OK\n";
