import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Copy, Code } from 'lucide-react';

export default function EmbedCodeGenerator() {
  const { toast } = useToast();

  const [leaderboardType, setLeaderboardType] = useState('net-leaderboard');
  const [displaySize, setDisplaySize] = useState('responsive');
  const [numPlayers, setNumPlayers] = useState('10');
  const [showHeader, setShowHeader] = useState(true);
  const [useCustomColors, setUseCustomColors] = useState(true);
  const [showLogo, setShowLogo] = useState(true);

  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : 'https://hideout-golf-league.example.com';

  const embedUrl = `${baseUrl}/public/leaderboard/${leaderboardType === 'net-leaderboard' ? 'net' : 'gross'}?rows=${numPlayers}&header=${showHeader}&colors=${useCustomColors}&logo=${showLogo}`;

  const directLinkUrl = `${baseUrl}/public/leaderboard/${leaderboardType === 'net-leaderboard' ? 'net' : 'gross'}`;

  // Generate the iframe embed code
  const generateEmbedCode = () => {
    let width, height;
    switch (displaySize) {
      case 'small':
        width = '300';
        height = '500';
        break;
      case 'medium':
        width = '600';
        height = '800';
        break;
      case 'large':
        width = '900';
        height = '1000';
        break;
      case 'responsive':
      default:
        width = '100%';
        height = '500';
        break;
    }

    return `<iframe 
  src="${embedUrl}" 
  width="${width}" 
  height="${height}" 
  frameborder="0"
  title="Hideout Golf League - ${leaderboardType === 'net-leaderboard' ? 'Net' : 'Gross'} Leaderboard"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen>
</iframe>`;
  };

  // Generate responsive embed code
  const generateResponsiveEmbedCode = () => {
    return `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;">
  <iframe 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    src="${embedUrl}" 
    frameborder="0"
    title="Hideout Golf League - ${leaderboardType === 'net-leaderboard' ? 'Net' : 'Gross'} Leaderboard"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen>
  </iframe>
</div>`;
  };

  const embedCode = generateEmbedCode();
  const responsiveEmbedCode = generateResponsiveEmbedCode();

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: 'Copied!',
          description: message,
        });
      })
      .catch((err) => {
        toast({
          title: 'Failed to copy',
          description: 'Please try again or copy manually',
          variant: 'destructive',
        });
      });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Generate Embed Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <Label htmlFor="embed-type" className="block text-sm font-medium mb-1">
                  Leaderboard Type
                </Label>
                <Select value={leaderboardType} onValueChange={setLeaderboardType}>
                  <SelectTrigger id="embed-type">
                    <SelectValue placeholder="Select leaderboard type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="net-leaderboard">Net Leaderboard</SelectItem>
                    <SelectItem value="gross-leaderboard">Gross Leaderboard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <Label htmlFor="embed-size" className="block text-sm font-medium mb-1">
                  Display Size
                </Label>
                <Select value={displaySize} onValueChange={setDisplaySize}>
                  <SelectTrigger id="embed-size">
                    <SelectValue placeholder="Select display size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="responsive">Responsive (Recommended)</SelectItem>
                    <SelectItem value="small">Small (300px x 500px)</SelectItem>
                    <SelectItem value="medium">Medium (600px x 800px)</SelectItem>
                    <SelectItem value="large">Large (900px x 1000px)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <Label htmlFor="embed-rows" className="block text-sm font-medium mb-1">
                  Number of Players to Display
                </Label>
                <Select value={numPlayers} onValueChange={setNumPlayers}>
                  <SelectTrigger id="embed-rows">
                    <SelectValue placeholder="Select number of players" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Top 10</SelectItem>
                    <SelectItem value="20">Top 20</SelectItem>
                    <SelectItem value="50">Top 50</SelectItem>
                    <SelectItem value="all">All Players</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <Label className="block text-sm font-medium mb-2">Style Options</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="embed-header"
                      checked={showHeader}
                      onCheckedChange={() => setShowHeader(!showHeader)}
                    />
                    <Label htmlFor="embed-header" className="text-sm">
                      Show Header
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="embed-colors"
                      checked={useCustomColors}
                      onCheckedChange={() => setUseCustomColors(!useCustomColors)}
                    />
                    <Label htmlFor="embed-colors" className="text-sm">
                      Use Custom Colors
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="embed-logo"
                      checked={showLogo}
                      onCheckedChange={() => setShowLogo(!showLogo)}
                    />
                    <Label htmlFor="embed-logo" className="text-sm">
                      Show League Logo
                    </Label>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => copyToClipboard(embedCode, 'Embed code copied to clipboard')}
                className="inline-flex items-center"
              >
                <Code className="mr-2 h-4 w-4" />
                Generate Embed Code
              </Button>
            </div>

            <div>
              <div className="mb-4">
                <Label className="block text-sm font-medium mb-1">Embed Code</Label>
                <div className="bg-neutral-50 rounded-md p-4 h-[200px] overflow-auto border border-neutral-200">
                  <pre className="text-xs text-neutral-700 whitespace-pre-wrap">{embedCode}</pre>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(embedCode, 'Embed code copied to clipboard')}
                  className="mt-2"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Code
                </Button>
              </div>

              <div className="mt-4">
                <Label className="block text-sm font-medium mb-1">Direct Link</Label>
                <div className="flex">
                  <Input value={directLinkUrl} readOnly className="flex-grow rounded-r-none" />
                  <Button
                    variant="outline"
                    className="rounded-l-none"
                    onClick={() =>
                      copyToClipboard(directLinkUrl, 'Direct link copied to clipboard')
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-6">
                <Label className="block text-sm font-medium mb-2">Preview</Label>
                <div className="border border-neutral-200 rounded-md bg-white p-4 text-center">
                  <div className="flex items-center justify-center bg-neutral-100 h-60 rounded">
                    <div className="text-center">
                      <div className="text-xl font-bold text-primary mb-2">Hideout Golf League</div>
                      <div className="text-lg font-semibold mb-4">
                        {leaderboardType === 'net-leaderboard' ? 'Net' : 'Gross'} Leaderboard
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between px-4">
                          <span className="font-medium">1. Michael Johnson</span>
                          <span>2,450 pts</span>
                        </div>
                        <div className="flex justify-between px-4">
                          <span className="font-medium">2. David Thompson</span>
                          <span>2,310 pts</span>
                        </div>
                        <div className="flex justify-between px-4">
                          <span className="font-medium">3. Robert Wilson</span>
                          <span>2,105 pts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Implementation Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-neutral-800 mb-1">1. Copy the Embed Code</h3>
              <p className="text-sm text-neutral-600">
                Generate and copy the iframe code from the panel above.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-neutral-800 mb-1">2. Paste into Your Website</h3>
              <p className="text-sm text-neutral-600">
                Add the code to your HTML where you want the leaderboard to appear.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-neutral-800 mb-1">3. Adjust as Needed</h3>
              <p className="text-sm text-neutral-600">
                You can modify the width and height attributes to fit your website's layout.
              </p>
            </div>

            <div className="bg-neutral-50 rounded-md p-4 border border-neutral-200">
              <h3 className="font-medium text-neutral-800 mb-2">Responsive Embed Example</h3>
              <pre className="text-xs text-neutral-700 whitespace-pre-wrap">
                {responsiveEmbedCode}
              </pre>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(responsiveEmbedCode, 'Responsive embed code copied to clipboard')
                }
                className="mt-2"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Responsive Code
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
