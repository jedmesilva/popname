import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useSubmitClaim } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Claim() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const submitClaim = useSubmitClaim();

  const formSchema = z.object({
    name: z.string().min(2, { message: t("claim.validation.nameMin") }),
    fullName: z.string().min(5, { message: t("claim.validation.fullNameRequired") }),
    country: z.string().min(2, { message: t("claim.validation.countryRequired") }),
    birthYear: z.coerce.number().min(1900).max(new Date().getFullYear()),
    email: z.string().email({ message: t("claim.validation.emailInvalid") }).optional().or(z.literal("")),
    documentType: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      fullName: "",
      country: "",
      birthYear: 2000,
      email: "",
      documentType: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    submitClaim.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          toast({
            title: t("claim.successTitle"),
            description: t("claim.successDesc", { id: data.id }),
          });
          form.reset();
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: t("claim.errorTitle"),
            description: t("claim.errorDesc"),
          });
        }
      }
    );
  }

  return (
    <div className="flex-1 container mx-auto px-4 py-16 max-w-3xl">
      <div className="text-center mb-16">
        <ShieldCheck className="w-16 h-16 mx-auto mb-6 text-accent" />
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-4">{t("claim.title")}</h1>
        <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest max-w-xl mx-auto leading-relaxed">
          {t("claim.subtitle")}
        </p>
      </div>

      <div className="border border-border bg-card p-8 md:p-12">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">{t("claim.fields.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("claim.placeholders.name")} className="font-mono uppercase" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">{t("claim.fields.fullName")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("claim.placeholders.fullName")} className="font-mono uppercase" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">{t("claim.fields.country")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("claim.placeholders.country")} className="font-mono uppercase" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">{t("claim.fields.birthYear")}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder={t("claim.placeholders.birthYear")} className="font-mono uppercase" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">{t("claim.fields.docType")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("claim.placeholders.docType")} className="font-mono uppercase" {...field} />
                    </FormControl>
                    <FormDescription className="font-mono text-[10px]">{t("claim.fields.docDesc")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono uppercase text-xs tracking-widest">{t("claim.fields.email")}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t("claim.placeholders.email")} className="font-mono uppercase" {...field} />
                    </FormControl>
                    <FormDescription className="font-mono text-[10px]">{t("claim.fields.emailDesc")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 font-bold text-lg uppercase tracking-widest"
              disabled={submitClaim.isPending}
            >
              {submitClaim.isPending ? t("claim.submitting") : t("claim.submit")}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
