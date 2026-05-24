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

const formSchema = z.object({
  baseNames: z.string().transform(val => val.split(',').map(s => s.trim()).filter(Boolean)),
  meaning: z.string().optional(),
  origin: z.string().optional(),
  style: z.string().optional(),
});

export function Forge() {
  const { toast } = useToast();
  const forgeName = useForgeName();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseNames: [] as unknown as string, // Handle string input for array output
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
            title: "Erro na forja",
            description: "A forja não conseguiu sintetizar um nome.",
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
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-4">Forjar Nome</h1>
        <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest leading-relaxed">
          Sintetize novos nomes a partir do índice. Forneça ingredientes etimológicos e deixe o motor gerar identidades únicas, verificadas contra bilhões de registros.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
        <div className="border border-border bg-card p-8">
          <h2 className="text-xl font-bold uppercase tracking-widest mb-8 border-b border-border pb-4">Parâmetros de Síntese</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="baseNames"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">Nomes Base (Separados por vírgula)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: LEO, MARIA" className="font-mono uppercase" {...field} />
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
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">Significado Desejado</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: GUERREIRO DA LUZ" className="font-mono uppercase resize-none h-24" {...field} />
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
                      <FormLabel className="font-mono uppercase text-xs tracking-widest">Origem</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: LATIM" className="font-mono uppercase" {...field} />
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
                      <FormLabel className="font-mono uppercase text-xs tracking-widest">Estilo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: MODERNO" className="font-mono uppercase" {...field} />
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
                {forgeName.isPending ? "Sintetizando..." : "Forjar Nome"}
              </Button>
            </form>
          </Form>
        </div>

        <div className="bg-muted/30 border border-border p-8 flex flex-col">
          <h2 className="text-xl font-bold uppercase tracking-widest mb-8 border-b border-border pb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" /> Resultados
          </h2>
          
          <div className="flex-1">
            {!result && !forgeName.isPending && (
              <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-sm uppercase text-center p-8">
                Aguardando parâmetros para iniciar a forja.
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
                        Único no Índice
                      </div>
                    )}
                    <div className="text-3xl font-bold uppercase tracking-tighter mb-2">{name.name}</div>
                    <div className="font-mono text-xs uppercase text-muted-foreground mb-4 space-y-1">
                      <div><span className="text-foreground/50">Origem:</span> {name.origin}</div>
                      <div><span className="text-foreground/50">Significado:</span> {name.meaning}</div>
                    </div>
                    {name.inspirations && name.inspirations.length > 0 && (
                      <div className="font-mono text-[10px] uppercase text-muted-foreground pt-4 border-t border-border">
                        Inspirado em: {name.inspirations.join(', ')}
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
