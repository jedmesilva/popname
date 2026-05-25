import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useForgeName } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Anvil, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
  baseNames: z.string().transform(val => val.split(',').map(s => s.trim()).filter(Boolean)),
  meaning: z.string().optional(),
  origin: z.string().optional(),
  style: z.string().optional(),
});

export function Forge() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const forgeName = useForgeName();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseNames: [] as unknown as string,
      meaning: "",
      origin: "",
      style: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    forgeName.mutate(
      { data: values },
      {
        onError: () => {
          toast({
            variant: "destructive",
            title: t("forge.errorTitle"),
            description: t("forge.errorDesc"),
          });
        }
      }
    );
  }

  const result = forgeName.data;

  return (
    <div className="flex-1 container mx-auto px-4 py-16">
      <div className="text-center mb-16 max-w-3xl mx-auto">
        <Anvil className="w-16 h-16 mx-auto mb-6 text-accent" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-4">{t("forge.title")}</h1>
        <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest leading-relaxed">
          {t("forge.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
        <div className="border border-border bg-card p-8">
          <h2 className="text-xl font-bold uppercase tracking-widest mb-8 border-b border-border pb-4">{t("forge.params")}</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="baseNames"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">{t("forge.fields.baseNames")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("forge.placeholders.baseNames")} className="font-mono uppercase" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="meaning"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">{t("forge.fields.meaning")}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("forge.placeholders.meaning")} className="font-mono uppercase resize-none h-24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs tracking-widest">{t("forge.fields.origin")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("forge.placeholders.origin")} className="font-mono uppercase" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono uppercase text-xs tracking-widest">{t("forge.fields.style")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("forge.placeholders.style")} className="font-mono uppercase" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-14 font-bold text-lg uppercase tracking-widest mt-8"
                disabled={forgeName.isPending}
              >
                {forgeName.isPending ? t("forge.submitting") : t("forge.submit")}
              </Button>
            </form>
          </Form>
        </div>

        <div className="bg-muted/30 border border-border p-8 flex flex-col">
          <h2 className="text-xl font-bold uppercase tracking-widest mb-8 border-b border-border pb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> {t("forge.results")}
          </h2>

          <div className="flex-1">
            {!result && !forgeName.isPending && (
              <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-sm uppercase text-center p-8">
                {t("forge.waiting")}
              </div>
            )}

            {forgeName.isPending && (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-border/50 border border-border" />
                ))}
              </div>
            )}

            {result?.suggestions && (
              <div className="space-y-4">
                {result.suggestions.map((name, i) => (
                  <div key={i} className="border border-border bg-card p-6 relative overflow-hidden group hover:border-accent transition-colors">
                    {name.isUnique && (
                      <div className="absolute top-0 right-0 bg-accent text-accent-foreground font-mono text-[10px] uppercase px-3 py-1 font-bold">
                        {t("forge.unique")}
                      </div>
                    )}
                    <div className="text-3xl font-bold uppercase tracking-tighter mb-2">{name.name}</div>
                    <div className="font-mono text-xs uppercase text-muted-foreground mb-4 space-y-1">
                      <div><span className="text-foreground/50">{t("forge.originLabel")}</span> {name.origin}</div>
                      <div><span className="text-foreground/50">{t("forge.meaningLabel")}</span> {name.meaning}</div>
                    </div>
                    {name.inspirations && name.inspirations.length > 0 && (
                      <div className="font-mono text-[10px] uppercase text-muted-foreground pt-4 border-t border-border">
                        {t("forge.inspiredBy")} {name.inspirations.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
