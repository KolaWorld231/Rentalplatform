import { CloudOff } from "lucide-react-native";
import { Text, View } from "react-native";
import { Button } from "./Button";
import { cn } from "../../lib/cn";

/**
 * A load failure, with a control that actually retries it.
 *
 * The six error branches this replaces all read "... Pull to refresh." and
 * none of the screens had a RefreshControl, so the one instruction they gave
 * did nothing. A user whose request failed had no way to try again short of
 * killing the app.
 */
export function ErrorState({
  message,
  onRetry,
  retrying,
  className,
}: {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <View className={cn("items-center gap-3 px-4 py-10", className)}>
      <CloudOff size={32} color="#8a8a8a" />
      <Text className="text-center text-sm text-content-strong">{message}</Text>
      <Button variant="secondary" size="sm" loading={retrying} onPress={onRetry}>
        Try again
      </Button>
    </View>
  );
}
